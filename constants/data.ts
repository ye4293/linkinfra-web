import { NavItem } from '@/types';
// import { RoleValue } from "@/enums";

export type User = {
  id: number;
  name: string;
  company: string;
  role: string;
  verified: boolean;
  status: string;
};
export const users: User[] = [
  {
    id: 1,
    name: 'Candice Schiner',
    company: 'Dell',
    role: 'Frontend Developer',
    verified: false,
    status: 'Active'
  },
  {
    id: 2,
    name: 'John Doe',
    company: 'TechCorp',
    role: 'Backend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 3,
    name: 'Alice Johnson',
    company: 'WebTech',
    role: 'UI Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 4,
    name: 'David Smith',
    company: 'Innovate Inc.',
    role: 'Fullstack Developer',
    verified: false,
    status: 'Inactive'
  },
  {
    id: 5,
    name: 'Emma Wilson',
    company: 'TechGuru',
    role: 'Product Manager',
    verified: true,
    status: 'Active'
  },
  {
    id: 6,
    name: 'James Brown',
    company: 'CodeGenius',
    role: 'QA Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 7,
    name: 'Laura White',
    company: 'SoftWorks',
    role: 'UX Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 8,
    name: 'Michael Lee',
    company: 'DevCraft',
    role: 'DevOps Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 9,
    name: 'Olivia Green',
    company: 'WebSolutions',
    role: 'Frontend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 10,
    name: 'Robert Taylor',
    company: 'DataTech',
    role: 'Data Analyst',
    verified: false,
    status: 'Active'
  }
];

export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    roles: [1, 10, 100]
  },
  {
    title: 'Channel',
    href: '/dashboard/channel',
    icon: 'channel',
    label: 'channel',
    roles: [10, 100]
  },
  {
    title: 'User',
    href: '/dashboard/user',
    icon: 'user',
    label: 'user',
    roles: [10, 100]
  },
  {
    title: 'Billing',
    href: '/dashboard/topup',
    icon: 'billing',
    label: 'topup',
    roles: [1, 10, 100]
  },
  {
    title: 'Keys',
    href: '/dashboard/token',
    icon: 'key',
    label: 'token',
    roles: [1, 10, 100]
  },
  {
    title: 'Usage',
    href: '/dashboard/log',
    icon: 'usage',
    label: 'log',
    roles: [1, 10, 100]
  },
  {
    title: 'Images',
    href: '/dashboard/image',
    icon: 'images',
    label: 'image',
    roles: [1, 10, 100]
  },
  {
    title: 'Videos',
    href: '/dashboard/video',
    icon: 'video',
    label: 'video',
    roles: [1, 10, 100]
  },
  {
    title: 'Statistics',
    href: '/dashboard/statistics',
    icon: 'chart',
    label: 'statistics',
    roles: [1, 10, 100]
  },
  {
    title: 'Playground',
    href: '/dashboard/playground',
    icon: 'playground',
    label: 'playground',
    roles: [1, 10, 100]
  },
  // {
  //   title: 'File',
  //   href: '/dashboard/file',
  //   icon: 'file',
  //   label: 'file',
  //   roles: [10, 100]
  // },
  {
    title: 'Setting',
    icon: 'setting',
    label: 'setting',
    roles: [1, 10, 100],
    children: [
      {
        title: 'Personal settings',
        href: '/dashboard/setting/updateUser',
        icon: 'user',
        label: 'personal-setting',
        roles: [1, 10, 100]
      },
      {
        title: 'System settings',
        href: '/dashboard/setting',
        icon: 'setting',
        label: 'system-setting',
        roles: [100]
      },
      {
        title: 'Payment settings',
        href: '/dashboard/setting/payment',
        icon: 'billing',
        label: 'payment-setting',
        roles: [100]
      },
      {
        title: 'Groups & model pricing',
        href: '/dashboard/setting/pricing',
        icon: 'billing',
        label: 'pricing-setting',
        roles: [100]
      },
      {
        title: 'Discount settings',
        href: '/dashboard/setting/discount',
        icon: 'billing',
        label: 'discount-setting',
        roles: [100]
      },
      {
        title: 'Model settings',
        href: '/dashboard/setting/model',
        icon: 'channel',
        label: 'model-setting',
        roles: [100]
      }
    ]
  }
  // {
  //   title: 'Kanban',
  //   href: '/dashboard/kanban',
  //   icon: 'kanban',
  //   label: 'kanban',
  //   roles: [10, 100]
  // }
];
