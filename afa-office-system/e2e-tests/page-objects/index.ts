// Base page object
export { BasePage } from './base-page';

// Login page
export { LoginPage, UserRole, type UserCredentials } from './login-page';

// Tenant management pages
export { TenantDashboardPage } from './tenant/tenant-dashboard-page';
export { TenantMerchantManagementPage, type MerchantData } from './tenant/tenant-merchant-management-page';
export { TenantDeviceManagementPage, type DeviceData } from './tenant/tenant-device-management-page';
export { TenantAccessRecordsPage, type AccessRecordFilter } from './tenant/tenant-access-records-page';

// Merchant management pages
export { MerchantDashboardPage } from './merchant/merchant-dashboard-page';
export { MerchantEmployeeManagementPage, type EmployeeData } from './merchant/merchant-employee-management-page';
export { MerchantVisitorManagementPage, type VisitorData, type AccessCodeConfig } from './merchant/merchant-visitor-management-page';
export { MerchantAccessRecordsPage, type MerchantAccessRecordFilter } from './merchant/merchant-access-records-page';

// Common components
export { NavigationComponent } from './components/navigation-component';
export { NotificationComponent, NotificationType } from './components/notification-component';
export { ModalComponent, ModalType } from './components/modal-component';
export { TableComponent, SortDirection } from './components/table-component';