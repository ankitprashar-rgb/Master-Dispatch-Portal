import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Layout({ children }) {
    const location = useLocation();

    const navItems = [
        { name: 'Dispatch', path: '/', icon: LayoutDashboard },
        { name: 'Tracking', path: '/tracking', icon: Truck },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Branding Bar */}
            <header className="bg-white px-8 h-20 flex items-center justify-between sticky top-0 z-20">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-[0.4em] text-gray-900 uppercase font-heading">
                        D I S P A T C H <span className="text-[#d4de47] ml-2">P O R T A L</span>
                    </h1>
                </div>

                {/* Tabs Navigation */}
                <nav className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/tracking' && location.pathname === '/summary');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                                )}
                            >
                                <Icon size={14} className={isActive ? "text-brand" : "text-gray-400"} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <img
                    src="https://res.cloudinary.com/du5vwtwvr/image/upload/v1762093742/IDE_Black_igvryv.png"
                    alt="IDE Logo"
                    className="h-10"
                />
            </header>

            {/* Separator Line */}
            <div className="h-0.5 w-full bg-[#d4de47] sticky top-20 z-20 shadow-sm"></div>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
