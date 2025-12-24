import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

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
    <div className="min-h-screen flex items-center justify-center bg-cyber-black font-terminal">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-cyber-red border border-cyber-red-dark flex items-center justify-center mb-4 cyber-glow-red">
            <span className="text-cyber-red text-2xl font-bold">◉</span>
          </div>
          <h2 className="text-2xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">
            Network Observatory Platform
          </h2>
          <p className="mt-2 text-cyber-gray-light uppercase tracking-wide text-sm">
            &gt; Authentication Required
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-cyber-purple uppercase tracking-wider">
                &gt; Username
              </label>
              <input
                {...register('username', { required: 'Username is required' })}
                type="text"
                className="input-cyber mt-1 block w-full px-3 py-2"
                placeholder="enter_username..."
              />
              {errors.username && (
                <p className="mt-1 text-sm text-cyber-red cyber-glow">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cyber-purple uppercase tracking-wider">
                &gt; Password
              </label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                className="input-cyber mt-1 block w-full px-3 py-2"
                placeholder="enter_password..."
              />
              {errors.password && (
                <p className="mt-1 text-sm text-cyber-red cyber-glow">{errors.password.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-cyber-darker border border-cyber-red text-cyber-red px-4 py-3 cyber-glow">
              &gt; ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-cyber w-full py-3 px-4 text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '&gt; Authenticating...' : '&gt; Access System'}
          </button>
        </form>
        
        <div className="text-center">
          <p className="text-cyber-gray-light text-sm font-terminal">
            &gt; Demo: <span className="text-cyber-green">admin</span> / <span className="text-cyber-green">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;