import React, { useState } from 'react';
import { auth } from '../../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';

export default function TecnicoLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('Bienvenido');
        } catch (error) {
            toast.error('Error al iniciar sesión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center px-6">
            <div className="mb-10 text-center">
                <div className="w-20 h-20 bg-orange-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h1 className="text-3xl font-black text-white px-8">Noar Técnico</h1>
                <p className="text-slate-400 mt-2 font-medium">Acceso para servicio en campo</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-2xl px-5 py-4 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-2xl px-5 py-4 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                />
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-400 text-white py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 disabled:opacity-50 shadow-xl shadow-orange-500/20"
                >
                    {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
    );
}
