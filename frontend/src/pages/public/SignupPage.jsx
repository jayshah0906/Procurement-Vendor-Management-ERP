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
                <div className="grid grid-cols-2 gap-4">
                  <Input label="GST Number" placeholder="29AAACC1234B1Z5" {...register('gst_number')} error={errors.gst_number?.message} />
                  <Input label="Phone" placeholder="+91 98765 43210" {...register('phone')} error={errors.phone?.message} />
                </div>
                <Input label="Address" placeholder="123 MG Road, Bangalore" {...register('address')} error={errors.address?.message} />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full py-3 mt-4 text-lg font-semibold shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50" disabled={isLoading}>
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
