import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import { gstApi } from '../../api/gst.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Buildings, UserCircle, ArrowLeft, SealCheck, WarningCircle, CircleNotch } from '@phosphor-icons/react';

const normalizeGstin = (value) => (value || '').replace(/\s+/g, '').toUpperCase();

const baseSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Please confirm your password'),
  role_name: z.enum(['Procurement Officer', 'Vendor']),
  // Vendor-only
  company_name: z.string().optional(),
  gst_number: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
}).refine((d) => {
  if (d.role_name === 'Vendor' && !d.company_name) return false;
  return true;
}, {
  message: 'Company name is required for vendor registration',
  path: ['company_name'],
}).refine((d) => d.role_name !== 'Vendor' || normalizeGstin(d.gst_number), {
  message: 'GST number is required for vendor registration',
  path: ['gst_number'],
});

const ROLE_OPTIONS = [
  {
    value: 'Procurement Officer',
    label: 'Procurement Staff',
    description: 'Internal team member who manages RFQs and vendor relations',
    icon: <UserCircle size={28} weight="duotone" />,
  },
  {
    value: 'Vendor',
    label: 'Vendor / Supplier',
    description: 'External supplier who submits quotations and manages orders',
    icon: <Buildings size={28} weight="duotone" />,
  },
];

export const SignupPage = () => {
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // { gstin, status: 'loading' | 'verified' | 'failed', result?, message? } — only applies while gstin matches the field
  const [gstCheck, setGstCheck] = useState(null);

  const { register, handleSubmit, watch, setValue, getValues, setError, clearErrors, formState: { errors } } = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { role_name: 'Procurement Officer' },
  });

  const selectedRole = watch('role_name');
  const currentGstin = normalizeGstin(watch('gst_number'));
  const gstState = gstCheck?.gstin === currentGstin ? gstCheck : null;

  const verifyGst = async () => {
    const gstin = normalizeGstin(getValues('gst_number'));
    if (!gstin) {
      setError('gst_number', { message: 'GST number is required for vendor registration' });
      return false;
    }
    clearErrors('gst_number');
    setGstCheck({ gstin, status: 'loading' });
    try {
      const result = await gstApi.verify(gstin);
      setGstCheck({ gstin, status: result.valid ? 'verified' : 'failed', result, message: result.message });
      if (result.valid) {
        if (!getValues('company_name') && (result.trade_name || result.legal_name)) {
          setValue('company_name', result.trade_name || result.legal_name, { shouldValidate: true });
        }
        if (!getValues('address') && result.address) setValue('address', result.address);
      }
      return result.valid;
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setGstCheck({
        gstin,
        status: 'failed',
        message: (typeof apiError === 'string' ? apiError : apiError?.message) || 'Could not verify GSTIN. Please try again.',
      });
      return false;
    }
  };

  const onSubmit = async (data) => {
    setServerError('');
    if (data.role_name === 'Vendor' && gstState?.status !== 'verified') {
      const ok = await verifyGst();
      if (!ok) return;
    }
    setIsLoading(true);
    try {
      const { confirm_password, ...payload } = data;
      if (payload.role_name === 'Vendor') payload.gst_number = normalizeGstin(payload.gst_number);
      const result = await authApi.register(payload);
      login(result.user, result.token, result.refresh_token);
      navigate('/erp/dashboard');
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setServerError(
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto py-12">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/60 z-0"></div>

      {/* Centered Content */}
      <div className="relative z-10 w-full max-w-xl px-4 flex flex-col items-center">
        {/* Aesthetic Site Name */}
        <div className="mb-6 text-center drop-shadow-2xl mt-4">
          <div className="flex items-center justify-center gap-3 font-extrabold text-5xl text-white tracking-tight mb-2">
            <span className="text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">∞</span> VendorBridge
          </div>
          <p className="text-gray-200 text-lg font-medium tracking-wide">Join Our Network</p>
        </div>

        <div className="w-full bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] border border-white/20 mb-12">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-royal-blue)] mb-4 transition-colors font-semibold">
            <ArrowLeft size={16} /> Back to Login
          </Link>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500 text-sm">Choose your role to get started.</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('role_name', opt.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedRole === opt.value
                    ? 'border-[var(--color-royal-blue)] bg-[var(--color-pale-blue)] shadow-md shadow-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white shadow-sm'
                }`}
              >
                <div className={`mb-2 ${selectedRole === opt.value ? 'text-[var(--color-royal-blue)]' : 'text-gray-400'}`}>
                  {opt.icon}
                </div>
                <p className={`font-semibold text-sm ${selectedRole === opt.value ? 'text-[var(--color-royal-blue)]' : 'text-gray-700'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-tight">{opt.description}</p>
              </button>
            ))}
          </div>

          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Rahul" {...register('first_name')} error={errors.first_name?.message} />
              <Input label="Last Name" placeholder="Sharma" {...register('last_name')} error={errors.last_name?.message} />
            </div>
            <Input label="Email Address" type="email" placeholder="you@company.com" {...register('email')} error={errors.email?.message} />
            <Input label="Password" type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
            <Input label="Confirm Password" type="password" placeholder="••••••••" {...register('confirm_password')} error={errors.confirm_password?.message} />

            {selectedRole === 'Vendor' && (
              <div className="space-y-4 border-t border-gray-200 pt-4 mt-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Information</p>
                <Input label="Company Name *" placeholder="ABC Traders Pvt Ltd" {...register('company_name')} error={errors.company_name?.message} />
                <div>
                  <label className="text-sm font-medium text-gray-700">GST Number *</label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      placeholder="27AAPFU0939F1ZV"
                      maxLength={15}
                      autoComplete="off"
                      className={`flex-1 min-w-0 px-3 py-2 border rounded-lg shadow-sm uppercase tracking-wider font-mono focus:outline-none focus:ring-2 transition-colors ${
                        errors.gst_number || gstState?.status === 'failed'
                          ? 'border-red-500 focus:ring-red-500'
                          : gstState?.status === 'verified'
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:ring-[var(--color-royal-blue)]'
                      }`}
                      {...register('gst_number')}
                    />
                    <Button
                      type="button"
                      variant={gstState?.status === 'verified' ? 'outline' : 'secondary'}
                      className={`shrink-0 gap-1.5 ${gstState?.status === 'verified' ? 'text-green-700 border-green-300 bg-green-50' : ''}`}
                      onClick={verifyGst}
                      disabled={gstState?.status === 'loading' || gstState?.status === 'verified'}
                    >
                      {gstState?.status === 'loading' ? (
                        <><CircleNotch size={16} className="animate-spin" /> Verifying</>
                      ) : gstState?.status === 'verified' ? (
                        <><SealCheck size={16} weight="fill" /> Verified</>
                      ) : (
                        'Verify GST'
                      )}
                    </Button>
                  </div>
                  {errors.gst_number && <span className="text-xs text-red-500 mt-1 block">{errors.gst_number.message}</span>}
                  {gstState?.status === 'failed' && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                      <WarningCircle size={16} weight="fill" className="shrink-0 mt-px" />
                      <span>{gstState.message}</span>
                    </div>
                  )}
                  {gstState?.status === 'verified' && (
                    <div className="mt-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 space-y-0.5">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <SealCheck size={16} weight="fill" className="shrink-0" /> {gstState.message}
                      </p>
                      {gstState.result.legal_name && <p><span className="text-green-700/80">Legal name:</span> {gstState.result.legal_name}</p>}
                      {gstState.result.trade_name && <p><span className="text-green-700/80">Trade name:</span> {gstState.result.trade_name}</p>}
                      <p>
                        <span className="text-green-700/80">State:</span> {gstState.result.state}
                        {gstState.result.status && <> · <span className="text-green-700/80">Status:</span> {gstState.result.status}</>}
                      </p>
                    </div>
                  )}
                </div>
                <Input label="Phone" placeholder="+91 98765 43210" {...register('phone')} error={errors.phone?.message} />
                <Input label="Address" placeholder="123 MG Road, Bangalore" {...register('address')} error={errors.address?.message} />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full py-3 mt-4 text-lg font-semibold shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50" disabled={isLoading || gstState?.status === 'loading'}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--color-royal-blue)] font-bold hover:underline hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
