import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
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
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Centered Content */}
      <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center">
        {/* Aesthetic Site Name */}
        <div className="mb-8 text-center drop-shadow-2xl">
          <div className="flex items-center justify-center gap-3 font-extrabold text-5xl text-white tracking-tight mb-2">
            <span className="text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">∞</span> VendorBridge
          </div>
          <p className="text-gray-200 text-lg font-medium tracking-wide">Streamline Your Sourcing</p>
        </div>

        {/* Glassmorphic Form Container */}
        <div className="w-full bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] border border-white/20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
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
              className="w-full py-3 mt-4 text-lg font-semibold shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[var(--color-royal-blue)] font-bold hover:underline hover:text-blue-700 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
