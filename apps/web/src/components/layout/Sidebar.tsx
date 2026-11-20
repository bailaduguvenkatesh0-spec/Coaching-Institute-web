import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  PhoneCall,
  UserCheck,
  GraduationCap,
  UploadCloud,
  AlertTriangle,
  ClipboardList,
  MessageSquareShare,
  BarChart3,
  Cpu,
  History,
  Settings,
  ExternalLink,
  BookOpen,
  Layers,
  CreditCard,
  Award,
  User,
  HeartHandshake,
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isExternal?: boolean;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'EXECUTIVE & GENERAL',
    items: [
      { name: 'Command Center', to: '/', icon: LayoutDashboard },
      { name: 'Staff Management', to: '/staff', icon: Users, badge: '5 Staff' },
      { name: 'Courses Curriculum', to: '/courses', icon: BookOpen },
      { name: 'Academic Batches', to: '/batches', icon: Layers },
      { name: 'Fee & Payments', to: '/fees', icon: CreditCard, badge: '₹' },
      { name: 'Exams & Results', to: '/exams', icon: Award },
    ],
  },
  {
    title: 'PROJECT 1: ADMISSIONS',
    items: [
      { name: 'Leads Pipeline & Kanban', to: '/leads', icon: UserPlus },
      { name: 'Counsellor Routing', to: '/counsellors', icon: UserCheck },
      { name: 'Follow-up Task Queue', to: '/follow-ups', icon: PhoneCall },
      { name: 'Public Enquiry Form', to: '/enquire', icon: ExternalLink },
    ],
  },
  {
    title: 'PROJECT 2: ACADEMIC & ENGAGEMENT',
    items: [
      { name: 'Students (100 Enrolled)', to: '/students', icon: GraduationCap, badge: '100' },
      { name: 'Attendance CSV Import', to: '/import-attendance', icon: UploadCloud },
      { name: 'At-Risk Rule Flags', to: '/at-risk', icon: AlertTriangle, badge: 'Rules' },
      { name: 'Coordinator Tasks', to: '/coordinator-tasks', icon: ClipboardList },
      { name: 'Parent Outreach Queue', to: '/parent-messages', icon: MessageSquareShare, badge: 'Gated' },
    ],
  },
  {
    title: 'PORTALS & TRANSPARENCY',
    items: [
      { name: 'Student Portal', to: '/student-portal', icon: User },
      { name: 'Parent Portal', to: '/parent-portal', icon: HeartHandshake },
    ],
  },
  {
    title: 'SYSTEM & MONITORING',
    items: [
      { name: 'Analytics & Reports', to: '/analytics', icon: BarChart3 },
      { name: 'n8n Automations', to: '/automations', icon: Cpu, badge: '16' },
      { name: 'Audit Logs', to: '/audit-logs', icon: History },
      { name: 'Platform Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="py-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <div className="px-5 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              {section.title}
            </div>
            <div className="space-y-0.5 px-3">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-400">Team B Automation Engine</div>
        <div>Release v1.0 • Client Demo Edition</div>
      </div>
    </aside>
  );
};
