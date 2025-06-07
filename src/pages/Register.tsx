import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'react-toastify';

const Register: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/map');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    const { error } = await register(name, email, password);

    if (error) {
      setError(error.message || 'Đăng ký thất bại');
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-blue-50">
        <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký thành công!</h2>
          <p className="text-gray-600 mb-8">
            Vui lòng kiểm tra email {email} để xác thực tài khoản của bạn
          </p>
          <Link to="/login">
            <Button className="w-full bg-red-600 hover:bg-red-700">
              Về trang đăng nhập
            </Button>
          </Link>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/">Quay lại Trang chủ</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-blue-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <img src="/logosc.png" alt="SafeConnect" className="h-12 mx-auto mb-2" />
          <p className="text-gray-600">Tạo tài khoản mới</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Họ và tên
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Mật khẩu
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="pl-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="pl-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Đang đăng ký...
              </div>
            ) : (
              'Đăng ký'
            )}
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">hoặc tiếp tục với</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // TODO: Implement Google signup
                toast(
                  <div>
                    <h4 className="font-bold">Sắp ra mắt</h4>
                    <p>Tính năng đang được phát triển</p>
                  </div>
                );
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-2" />
              Google
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // TODO: Implement Facebook signup
                toast(<>
                  <h4 className="font-bold">Sắp ra mắt</h4>
                  <p>Tính năng đang được phát triển</p>
                </>);
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook" className="w-5 h-5 mr-2" />
              Facebook
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Đã có tài khoản? 
          <Link to="/login" className="ml-1 text-blue-600 hover:text-blue-500 transition-colors duration-200">
            Đăng nhập ngay
          </Link>
        </p>
        <div className="mt-4 text-center">
          <Button variant="outline" asChild>
            <Link to="/">Quay lại Trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Register;