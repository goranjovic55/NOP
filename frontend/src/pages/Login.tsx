import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { Button, Input } from '../components/DesignSystem';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await authService.login(data.username, data.password);
      const userResponse = await authService.getCurrentUser(response.access_token);
      
      login(response.access_token, userResponse);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-black px-4">
      <div className="max-w-md w-full space-y-8 padding-responsive">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-cyber-red border border-cyber-red-dark flex items-center justify-center mb-4 cyber-glow-red">
            <span className="text-cyber-red text-3xl-cyber font-bold">◉</span>
          </div>
          <h2 className="text-2xl-cyber font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">
            Network Observatory Platform
          </h2>
          <p className="mt-2 text-cyber-gray-light uppercase tracking-wide text-sm-cyber">
            &gt; Authentication Required
          </p>
        </div>
        
        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm-cyber font-medium text-cyber-purple uppercase tracking-wider mb-2">
                &gt; Username
              </label>
              <Input
                {...register('username', { required: 'Username is required' })}
                type="text"
                placeholder="enter_username..."
                size="md"
              />
              {errors.username && (
                <p className="mt-1 text-sm-cyber text-cyber-red cyber-glow">{errors.username.message}</p>
              )}
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm-cyber font-medium text-cyber-purple uppercase tracking-wider mb-2">
                &gt; Password
              </label>
              <Input
                {...register('password', { required: 'Password is required' })}
                type="password"
                placeholder="enter_password..."
                size="md"
              />
              {errors.password && (
                <p className="mt-1 text-sm-cyber text-cyber-red cyber-glow">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-cyber-darker border border-cyber-red text-cyber-red px-4 py-3 cyber-glow text-sm-cyber">
              &gt; ERROR: {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '&gt; Authenticating...' : '&gt; Access System'}
          </Button>
        </form>
        
        {/* Demo Credentials */}
        <div className="text-center">
          <p className="text-cyber-gray-light text-sm-cyber">
            &gt; Demo: <span className="text-cyber-green">admin</span> / <span className="text-cyber-green">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;