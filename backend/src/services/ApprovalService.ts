import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { approval_status, quotation_status, po_status, vendor_status } from "../generated/prisma/client";

export class ApprovalService {
  static async initiateApproval(
    actorId: string,
    organizationId: string,
    data: {
      entity_type: string;
      entity_id: string;
      approvers: Array<{
        approver_id: string;
        level_no: number;
      }>;
    }
  ) {
    // 1. Verify target entity exists based on entity_type
    if (data.entity_type === "quotation") {
      const quotation = await prisma.quotations.findFirst({
        where: { id: data.entity_id, organization_id: organizationId, deleted_at: null },
      });
      if (!quotation) throw new NotFoundError("Quotation not found");
    } else if (data.entity_type === "po") {
      const po = await prisma.purchase_orders.findFirst({
        where: { id: data.entity_id, organization_id: organizationId, deleted_at: null },
      });
      if (!po) throw new NotFoundError("Purchase Order not found");
    } else if (data.entity_type === "vendor") {
      const vendor = await prisma.vendors.findFirst({
        where: { id: data.entity_id, organization_id: organizationId, deleted_at: null },
      });
      if (!vendor) throw new NotFoundError("Vendor not found");
    } else {
      throw new BadRequestError(`Invalid entity type for approval: ${data.entity_type}`);
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Upsert/Create Workflow Header
      const workflow = await tx.approval_workflows.upsert({
        where: { entity_type_entity_id: { entity_type: data.entity_type, entity_id: data.entity_id } },
        update: {
          current_level: 1,
          status: "pending",
          initiated_by: actorId,
          deleted_at: null,
        },
        create: {
          organization_id: organizationId,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          initiated_by: actorId,
          current_level: 1,
          status: "pending",
        },
      });

      // Clear existing steps if resetting
      await tx.approval_steps.deleteMany({
        where: { workflow_id: workflow.id },
      });

      // 3. Create Workflow Steps
      const steps = await Promise.all(
        data.approvers.map((app) =>
          tx.approval_steps.create({
            data: {
              workflow_id: workflow.id,
              approver_id: app.approver_id,
              level_no: app.level_no,
              status: "pending",
            },
          })
        )
      );

      // 4. Update Target Entity Status to reflect approval is in progress
      if (data.entity_type === "quotation") {
        await tx.quotations.update({
          where: { id: data.entity_id },
          data: { status: "under_review" },
        });
      } else if (data.entity_type === "po") {
        await tx.purchase_orders.update({
          where: { id: data.entity_id },
          data: { status: "sent" },
        });
      } else if (data.entity_type === "vendor") {
        await tx.vendors.update({
          where: { id: data.entity_id },
          data: { status: "pending" },
        });
      }

      // 5. Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "approval_workflows",
        entityId: workflow.id,
        action: "APPROVAL_INITIATED",
        newValue: { entity_type: data.entity_type, entity_id: data.entity_id, steps: data.approvers.length },
      });

      return {
        workflow,
        steps,
      };
    });
  }

  static async getWorkflow(organizationId: string | null, workflowId: string) {
    const workflow = await prisma.approval_workflows.findFirst({
      where: { id: workflowId, organization_id: organizationId, deleted_at: null },
      include: {
        approval_steps: {
          where: { deleted_at: null },
          orderBy: { level_no: "asc" },
          include: {
            users: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        },
        users: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError("Approval workflow not found");
    }

    return workflow;
  }

  static async executeStepAction(
    actorId: string,
    organizationId: string,
    workflowId: string,
    stepId: string,
    data: {
      action: "approve" | "reject" | "request_changes";
      remarks?: string;
    }
  ) {
    const workflow = await prisma.approval_workflows.findFirst({
      where: { id: workflowId, organization_id: organizationId, deleted_at: null },
      include: { approval_steps: { where: { deleted_at: null } } },
    });

    if (!workflow) {
      throw new NotFoundError("Approval workflow not found");
    }

    if (workflow.status !== "pending") {
      throw new BadRequestError(`Approval workflow is already completed (status: ${workflow.status})`);
    }

    const step = workflow.approval_steps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundError("Approval step not found in this workflow");
    }

    if (step.status !== "pending") {
      throw new BadRequestError(`Approval step is already completed (status: ${step.status})`);
    }

    // 1. Authorize: Check if the actor is the designated approver
    if (step.approver_id !== actorId) {
      throw new ForbiddenError("You are not authorized to approve this step");
    }

    // 2. Sequence check: Check if current_level matches step level_no
    if (step.level_no !== workflow.current_level) {
      throw new BadRequestError(`Approval is currently at level ${workflow.current_level}, not level ${step.level_no}`);
    }

    return await prisma.$transaction(async (tx) => {
      // 3. Map action to database status
      const dbStatus: approval_status = data.action === "approve" ? "approved" : "rejected";

      // 4. Update the step
      const updatedStep = await tx.approval_steps.update({
        where: { id: stepId },
        data: {
          status: dbStatus,
          remarks: data.remarks || null,
          action_at: new Date(),
        },
      });

      // 5. Evaluate overall workflow status
      let nextLevel = workflow.current_level;
      let workflowStatus: approval_status = "pending";

      if (dbStatus === "rejected") {
        workflowStatus = "rejected";
      } else {
        // Step approved. Check if there are other steps at this level that are pending
        const otherStepsAtLevel = workflow.approval_steps.filter(
          (s) => s.level_no === step.level_no && s.id !== stepId
        );
        const allApprovedAtLevel = otherStepsAtLevel.every((s) => s.status === "approved");

        if (allApprovedAtLevel) {
          // Find next level available
          const remainingSteps = workflow.approval_steps.filter((s) => s.level_no > step.level_no);
          if (remainingSteps.length > 0) {
            const nextLevels = remainingSteps.map((s) => s.level_no);
            nextLevel = Math.min(...nextLevels);
          } else {
            // No higher levels remaining. Entire workflow approved!
            workflowStatus = "approved";
          }
        }
      }

      // Update workflow header
      await tx.approval_workflows.update({
        where: { id: workflowId },
        data: {
          status: workflowStatus,
          current_level: nextLevel,
        },
      });

      // 6. Transition target entity status if workflow is finished
      if (workflowStatus !== "pending") {
        const entityId = workflow.entity_id;
        const entityType = workflow.entity_type;

        if (entityType === "quotation") {
          const quoStatus: quotation_status = workflowStatus === "approved" ? "selected" : "rejected";
          await tx.quotations.update({
            where: { id: entityId },
            data: { status: quoStatus },
          });

          // If quotation is selected, update the RFQ status to approved
          if (quoStatus === "selected") {
            const quotation = await tx.quotations.findUnique({
              where: { id: entityId },
            });
            if (quotation && quotation.rfq_id) {
              await tx.rfqs.update({
                where: { id: quotation.rfq_id },
                data: { status: "approved" },
              });
            }
          }
        } else if (entityType === "po") {
          const poStatus: po_status = workflowStatus === "approved" ? "accepted" : "cancelled";
          await tx.purchase_orders.update({
            where: { id: entityId },
            data: { status: poStatus },
          });
        } else if (entityType === "vendor") {
          const venStatus: vendor_status = workflowStatus === "approved" ? "active" : "rejected";
          await tx.vendors.update({
            where: { id: entityId },
            data: { status: venStatus, onboarding_completed: workflowStatus === "approved" },
          });
        }
      }

      // 7. Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "approval_workflows",
        entityId: workflowId,
        action: `APPROVAL_STEP_${data.action.toUpperCase()}`,
        newValue: { step_id: stepId, remarks: data.remarks, workflow_status: workflowStatus },
      });

      return {
        step: updatedStep,
        workflow_status: workflowStatus,
        current_level: nextLevel,
      };
    });
  }
}
