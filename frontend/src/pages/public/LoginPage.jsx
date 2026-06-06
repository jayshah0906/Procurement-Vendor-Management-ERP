import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data) => {
    // Mocking authentication success
    console.log("Form Data:", data);
    const mockUser = {
      id: 'usr_123',
      name: 'Test Manager',
      email: data.email,
      role: 'Manager', // Assigning Manager role for testing
    };
    const mockToken = 'mock-jwt-token-xyz';
    
    login(mockUser, mockToken);
    navigate('/erp/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      
      {/* Left Side: Branding/Graphic */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[var(--color-royal-blue)] to-[var(--color-eggplant)] text-white flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
        <h1 className="text-5xl font-bold mb-6 tracking-tight relative z-10">Streamline Your Sourcing.</h1>
        <p className="text-xl text-blue-100 max-w-md relative z-10">
          Connect with top-tier vendors, manage RFQs seamlessly, and automate your entire procurement lifecycle.
        </p>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-gray-500">
              {isLogin ? 'Enter your credentials to access your dashboard.' : 'Sign up to start managing your vendors.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!isLogin && (
              <Input 
                label="Full Name" 
                placeholder="John Doe" 
                {...register("name")} 
              />
            )}
            
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="you@company.com" 
              {...register("email")}
              error={errors.email?.message} 
            />
            
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              {...register("password")}
              error={errors.password?.message} 
            />

            <Button type="submit" variant="primary" className="w-full py-3 mt-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-[var(--color-royal-blue)] font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};
