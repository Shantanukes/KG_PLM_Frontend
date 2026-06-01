// This file mocks the Redux selectors to provide the exact data structure required by the components.
// In your actual application, replace these with your real Redux selectors (e.g., from 'src/store/...').

export const useUserRole = () => 'Admin/IT Head'; // Mocks user role from state
export const useUserAvatar = () => 'RA';
export const useUserName = () => 'Rohit Agarwal';

export const useKpiStats = () => ({
  openEcr: { value: 12, label: 'Open ECRs', delta: '+3 today', deltaType: 'up', icon: 'pending_actions', color: 'text-amber-500', barColor: 'bg-amber-500', fill: 65 },
  partsAwaiting: { value: 8, label: 'Parts Awaiting Approval', delta: '2 overdue', deltaType: 'down', icon: 'approval', color: 'text-red-500', barColor: 'bg-red-500', fill: 40 },
  partsReleased: { value: 47, label: 'Parts Released This Week', delta: '+14 vs last week', deltaType: 'up', icon: 'new_releases', color: 'text-emerald-500', barColor: 'bg-emerald-500', fill: 78 },
  overdueTasks: { value: 3, label: 'Overdue Tasks', delta: '-1 vs yesterday', deltaType: 'neutral', icon: 'task_alt', color: 'text-blue-500', barColor: 'bg-blue-500', fill: 15 },
});

export const useMyTasks = () => [
  { id: '1', title: 'Review BMS PCB Drawing — Safar Smart', meta: 'DRW-52-BA152002-RevB', submitter: 'Priya Mehta', age: '2h overdue', isOverdue: true, actions: ['Approve', 'Reject'] },
  { id: '2', title: 'ECR Technical Review — Motor Controller Upgrade', meta: 'KG-ECR-2026-0043', submitter: 'Zulu High-Speed', age: '6h remaining', isOverdue: false, actions: ['Review'] },
  { id: '3', title: 'Approve Part Release — BLDC Motor 350W', meta: 'GA151002', submitter: 'E-Luna Pro', age: '1d 4h remaining', isOverdue: false, actions: ['Approve', 'Reject'] },
  { id: '4', title: 'Review ECN-Eng — Battery Cell Chemistry Mismatch', meta: 'KG-ECN-ENG-2026-008', submitter: 'K-Star DX', age: '2d remaining', isOverdue: false, actions: ['Review'] },
  { id: '5', title: 'Variant BOM Approval — E-Luna Prime Twin Battery', meta: 'ASSY-GA1-VAR-PRIME', submitter: '2W Platform', age: '12h remaining', isOverdue: false, actions: ['Review'] },
  { id: '6', title: 'AIS-038 Compliance Sign-off — Battery Pack', meta: 'GA152001 Rev C', submitter: 'Regulatory', age: '4h overdue', isOverdue: true, actions: ['Sign Off'] },
];

export const useBomHealth = () => ({
  healthyPercentage: 94,
  data: [
    { label: 'Released', percentage: 72, color: '#10B981' },
    { label: 'In Review', percentage: 18, color: '#F59E0B' },
    { label: 'Draft', percentage: 6, color: '#EF4444' },
    { label: 'Superseded', percentage: 4, color: '#8B5CF6' },
  ]
});

export const useChangeVelocity = () => ({
  weeks: [
    { label: 'W1', value: 45 },
    { label: 'W2', value: 60 },
    { label: 'W3', value: 85 },
    { label: 'W4', value: 70 },
    { label: 'W5', value: 90 },
  ],
  stats: {
    ecrsRaised: 23,
    ecnsClosed: 18,
    avgCycle: '4.2d'
  }
});
