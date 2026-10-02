import type {PropsWithChildren} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../features/auth/AuthContext';
import type {Role} from '../types/api';

export function Protected({role, children}: { role?: Role } & PropsWithChildren) {
    const {session} = useAuth();
    const location = useLocation();
    if (!session) return <Navigate to="/login" state={{from: location.pathname + location.search + location.hash}}
                                   replace/>;
    if (role && session.role !== role) return <Navigate to="/403" replace/>;
    return children
}

export function Guest({children}: PropsWithChildren) {
    const {session} = useAuth();
    if (session) return <Navigate to={session.role === 'CANDIDATE' ? '/candidate/dashboard' : '/employer/dashboard'}
                                  replace/>;
    return children
}
