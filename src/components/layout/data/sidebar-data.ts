import {
  Warehouse,
  House,
  ReceiptText,
  LayoutDashboard,
  FileHeart,
  MapPinHouse,
  Anchor,
  MapPinPlus,
  Store,
  BriefcaseBusiness,
  Route as RouteIcon,
  Trophy,
  ChartArea,
  ChartLine,
  ChartNoAxesCombined,
  LocateFixed,
  CalendarClock,
  User,
  UserRoundCog,
  ListRestart,
  Undo2,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'Dashboards',
      items: [
        {
          title: 'Overview',
          url: '/dashboard/overview',
          icon: LayoutDashboard,
        },
        { title: 'Home Report', url: '/dashboard/home-report', icon: House },
        {
          title: 'Heart Count',
          url: '/dashboard/heart-count',
          icon: FileHeart,
        },
      ],
    },
    {
      title: 'Master Settings',
      items: [
        {
          title: 'Demarcation',
          url: '/master-settings/demarcation',
          icon: MapPinHouse,
        },
        {
          title: 'Distributor Mapping',
          url: '/master-settings/distributor-mapping',
          icon: Anchor,
        },
        {
          title: 'Final Geography Mapping',
          url: '/master-settings/final-geography-mapping',
          icon: MapPinPlus,
        },
      ],
    },
    {
      title: 'Sales',
      items: [
        {
          title: 'Sales Details',
          icon: ReceiptText,
          items: [
            {
              title: 'View All Items',
              url: '/sales/sales-details/view-all-items',
            },
            { title: 'Stock', url: '/sales/sales-details/stock' },
            /* {
              title: 'View Invoices',
              url: '/sales/sales-details/view-invoices',
            }, */
            {
              title: 'Market Return',
              url: '/sales/sales-details/market-return',
            },
          ],
        },
        {
          title: 'Sales Operations',
          icon: BriefcaseBusiness,
          items: [
            {
              title: 'Manage Category',
              url: '/sales/sales-operations/manage-category',
            },
            {
              title: 'Item Master',
              url: '/sales/sales-operations/item-master',
            },
            { title: 'Item Add', url: '/sales/sales-operations/item-add' },
            {
              title: 'Working Day',
              url: '/sales/sales-operations/working-day',
            },
            { title: 'Target', url: '/sales/sales-operations/target' },
            { title: 'Free Issue', url: '/sales/sales-operations/free-issue' },
          ],
        },
      ],
    },
    {
      title: 'Outlet Module',
      items: [
        { title: 'Outlets', url: '/outlet-module/outlets', icon: Store },
        {
          title: 'Route',
          url: '/outlet-module/routes',
          icon: RouteIcon,
        },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          title: 'Achievement Category Wise',
          url: '/reports/achievement-category-wise',
          icon: Trophy,
        },
        {
          title: 'Area Wise Sales Report',
          url: '/reports/area-wise-sales-report',
          icon: ChartArea,
        },
        {
          title: 'Territory Wise Sales Report',
          url: '/reports/territory-wise-sales-report',
          icon: ChartLine,
        },
        {
          title: 'Territory Wise Items Report',
          url: '/reports/territory-wise-items-report',
          icon: ChartNoAxesCombined,
        },
      ],
    },
    {
      title: 'HR Module',
      items: [
        {
          title: 'GPS Monitoring',
          url: '/hr-module/gps-monitoring',
          icon: LocateFixed,
        },
        {
          title: 'Time Attendance',
          url: '/hr-module/time-attendance',
          icon: CalendarClock,
        },
      ],
    },
    {
      title: 'Admin Module',
      items: [
        {
          title: 'User Module',
          icon: User,
          items: [
            {
              title: 'Add/Modifiy User',
              url: '/admin-module/user-module/add-modifiy-user',
            },
          ],
        },
        {
          title: 'Operation',
          icon: UserRoundCog,
          items: [
            {
              title: 'Manual Bill Quota',
              url: '/admin-module/operation/manual-bill-quota',
            },
          ],
        },
      ],
    },
    {
      title: 'Agency Module',
      items: [
        {
          title: 'Invoice',
          icon: ReceiptText,
          items: [
            {
              title: 'View Invoice',
              url: '/agency-module/invoice/view-invoice',
            },

            /*    {
              title: 'Post Invoice',
              url: '/agency-module/invoice/post-invoice',
            }, */
            {
              title: 'Manual Invoice',
              url: '/agency-module/invoice/manual-invoice',
            },
            {
              title: 'Invoices Summary',
              url: '/agency-module/invoice/invoices-summary',
            },
          ],
        },
        {
          title: 'Loading List',
          icon: ListRestart,
          items: [
            {
              title: 'View Loading List',
              url: '/agency-module/loading-list/view-loading-list',
            },
          ],
        },
        {
          title: 'Return',
          icon: Undo2,
          items: [
            {
              title: 'Market Return',
              url: '/agency-module/market-return/return',
            },
          ],
        },
        {
          title: 'Stock',
          icon: Warehouse,
          items: [
            { title: 'View Stock', url: '/agency-module/stock/view-stock' },
            { title: 'Add Stock', url: '/agency-module/stock/add-stock' },
            {
              title: 'Request Order',
              url: '/agency-module/stock/request-order',
            },
          ],
        },
      ],
    },
  ],
}
