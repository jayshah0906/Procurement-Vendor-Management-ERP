import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginPage = () => {
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const result = await authApi.login(data.email, data.password);
      // result = { token, refresh_token, user: { id, first_name, last_name, email, role, ... } }
      login(result.user, result.token, result.refresh_token);
      navigate('/erp/dashboard');
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side: Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[var(--color-royal-blue)] to-[var(--color-eggplant)] text-white flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>
        <h1 className="text-5xl font-bold mb-6 tracking-tight relative z-10">Streamline Your Sourcing.</h1>
        <p className="text-xl text-blue-100 max-w-md relative z-10">
          Connect with top-tier vendors, manage RFQs seamlessly, and automate your entire procurement lifecycle.
        </p>
        <div className="mt-12 relative z-10 space-y-3">
          {['Vendor Management', 'RFQ Automation', 'Approval Workflows', 'Spend Analytics'].map((item) => (
            <div key={item} className="flex items-center gap-3 text-blue-100">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-2xl text-[var(--color-royal-blue)] mb-6">
              <span className="text-3xl">∞</span> VendorBridge
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Enter your credentials to access your dashboard.</p>
          </div>

          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Access is invitation-only. Contact your administrator to get started.
          </p>
        </div>
      </div>
    </div>
  );
};
