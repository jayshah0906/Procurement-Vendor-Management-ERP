import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Buildings, UserCircle, ArrowLeft } from '@phosphor-icons/react';

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { role_name: 'Procurement Officer' },
  });

  const selectedRole = watch('role_name');

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const { confirm_password, ...payload } = data;
      const result = await authApi.register(payload);
      login(result.user, result.token, result.refresh_token);
      navigate('/erp/dashboard');
    } catch (err) {
      setServerError(
        err?.response?.data?.error || err?.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[var(--color-royal-blue)] to-[var(--color-eggplant)] text-white flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />
        <h1 className="text-5xl font-bold mb-6 tracking-tight relative z-10">Join VendorBridge.</h1>
        <p className="text-xl text-blue-100 max-w-md relative z-10">
          Create your account and start managing procurement with ease. Whether you're a buyer or a supplier, we've got you covered.
        </p>
        <div className="mt-12 relative z-10 space-y-3">
          {['Role-based access control', 'Real-time notifications', 'Automated approval workflows', 'GST-compliant invoicing'].map((item) => (
            <div key={item} className="flex items-center gap-3 text-blue-100">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-royal-blue)] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </Link>

          <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 font-bold text-2xl text-[var(--color-royal-blue)] mb-4">
                <span className="text-3xl">∞</span> VendorBridge
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
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
                      ? 'border-[var(--color-royal-blue)] bg-[var(--color-pale-blue)]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" placeholder="Rahul" {...register('first_name')} error={errors.first_name?.message} />
                <Input label="Last Name" placeholder="Sharma" {...register('last_name')} error={errors.last_name?.message} />
              </div>
              <Input label="Email Address" type="email" placeholder="you@company.com" {...register('email')} error={errors.email?.message} />
              <Input label="Password" type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" {...register('confirm_password')} error={errors.confirm_password?.message} />

              {selectedRole === 'Vendor' && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Information</p>
                  <Input label="Company Name *" placeholder="ABC Traders Pvt Ltd" {...register('company_name')} error={errors.company_name?.message} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="GST Number" placeholder="29AAACC1234B1Z5" {...register('gst_number')} error={errors.gst_number?.message} />
                    <Input label="Phone" placeholder="+91 98765 43210" {...register('phone')} error={errors.phone?.message} />
                  </div>
                  <Input label="Address" placeholder="123 MG Road, Bangalore" {...register('address')} error={errors.address?.message} />
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full py-3 mt-2" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--color-royal-blue)] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
