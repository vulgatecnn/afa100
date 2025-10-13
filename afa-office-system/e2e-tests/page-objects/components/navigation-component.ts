import { Page, Locator, expect } from '@playwright/test';

/**
 * 导航组件页面对象
 * 提供通用的导航菜单操作和验证功能
 */
export class NavigationComponent {
  private readonly page: Page;

  // 主导航元素
  readonly navigationMenu: Locator;
  readonly menuToggle: Locator;
  readonly logo: Locator;
  readonly userProfile: Locator;
  readonly userDropdown: Locator;
  readonly logoutButton: Locator;

  // 面包屑导航
  readonly breadcrumb: Locator;
  readonly breadcrumbItems: Locator;
  readonly homeLink: Locator;

  // 侧边栏菜单
  readonly sidebarMenu: Locator;
  readonly menuItems: Locator;
  readonly subMenuItems: Locator;
  readonly collapsedMenu: Locator;
  readonly expandedMenu: Locator;

  // 顶部导航栏
  readonly topNavbar: Locator;
  readonly navbarBrand: Locator;
  readonly navbarNav: Locator;
  readonly navbarToggler: Locator;

  // 移动端导航
  readonly mobileMenu: Locator;
  readonly mobileMenuButton: Locator;
  readonly mobileMenuOverlay: Locator;

  constructor(page: Page) {
    this.page = page;

    // 主导航元素
    this.navigationMenu = page.locator('[data-testid="navigation-menu"], .navigation-menu, .ant-menu');
    this.menuToggle = page.locator('[data-testid="menu-toggle"], .menu-toggle');
    this.logo = page.locator('[data-testid="logo"], .logo');
    this.userProfile = page.locator('[data-testid="user-profile"], .user-profile');
    this.userDropdown = page.locator('[data-testid="user-dropdown"], .user-dropdown');
    this.logoutButton = page.locator('[data-testid="logout-button"], .logout-btn');

    // 面包屑导航
    this.breadcrumb = page.locator('[data-testid="breadcrumb"], .breadcrumb, .ant-breadcrumb');
    this.breadcrumbItems = page.locator('[data-testid="breadcrumb-item"], .breadcrumb-item, .ant-breadcrumb-link');
    this.homeLink = page.locator('[data-testid="home-link"], .home-link');

    // 侧边栏菜单
    this.sidebarMenu = page.locator('[data-testid="sidebar-menu"], .sidebar-menu');
    this.menuItems = page.locator('[data-testid="menu-item"], .menu-item, .ant-menu-item');
    this.subMenuItems = page.locator('[data-testid="submenu-item"], .submenu-item, .ant-menu-submenu');
    this.collapsedMenu = page.locator('[data-testid="collapsed-menu"], .collapsed-menu');
    this.expandedMenu = page.locator('[data-testid="expanded-menu"], .expanded-menu');

    // 顶部导航栏
    this.topNavbar = page.locator('[data-testid="top-navbar"], .top-navbar, .navbar');
    this.navbarBrand = page.locator('[data-testid="navbar-brand"], .navbar-brand');
    this.navbarNav = page.locator('[data-testid="navbar-nav"], .navbar-nav');
    this.navbarToggler = page.locator('[data-testid="navbar-toggler"], .navbar-toggler');

    // 移动端导航
    this.mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu');
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"], .mobile-menu-button');
    this.mobileMenuOverlay = page.locator('[data-testid="mobile-menu-overlay"], .mobile-menu-overlay');
  }

  /**
   * 验证导航菜单已加载
   */
  async expectNavigationLoaded(): Promise<void> {
    await expect(this.navigationMenu).toBeVisible();
  }

  /**
   * 点击菜单项
   */
  async clickMenuItem(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`).first();
    await menuItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击子菜单项
   */
  async clickSubMenuItem(parentMenu: string, subMenu: string): Promise<void> {
    // 先点击父菜单展开子菜单
    const parentMenuItem = this.navigationMenu.locator(`text=${parentMenu}`).first();
    await parentMenuItem.click();
    
    // 等待子菜单展开
    await this.page.waitForTimeout(300);
    
    // 点击子菜单项
    const subMenuItem = this.navigationMenu.locator(`text=${subMenu}`).first();
    await subMenuItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证菜单项是否存在
   */
  async expectMenuItemExists(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`);
    await expect(menuItem).toBeVisible();
  }

  /**
   * 验证菜单项是否激活
   */
  async expectMenuItemActive(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`).first();
    await expect(menuItem).toHaveClass(/active|selected|ant-menu-item-selected/);
  }

  /**
   * 验证菜单项是否禁用
   */
  async expectMenuItemDisabled(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`).first();
    await expect(menuItem).toHaveClass(/disabled|ant-menu-item-disabled/);
  }

  /**
   * 切换菜单折叠状态
   */
  async toggleMenuCollapse(): Promise<void> {
    await this.menuToggle.click();
    await this.page.waitForTimeout(300); // 等待动画完成
  }

  /**
   * 验证菜单是否折叠
   */
  async expectMenuCollapsed(): Promise<void> {
    const isCollapsed = await this.collapsedMenu.isVisible().catch(() => false);
    const hasCollapsedClass = await this.sidebarMenu.getAttribute('class');
    
    expect(isCollapsed || hasCollapsedClass?.includes('collapsed')).toBeTruthy();
  }

  /**
   * 验证菜单是否展开
   */
  async expectMenuExpanded(): Promise<void> {
    const isExpanded = await this.expandedMenu.isVisible().catch(() => false);
    const hasExpandedClass = await this.sidebarMenu.getAttribute('class');
    
    expect(isExpanded || !hasExpandedClass?.includes('collapsed')).toBeTruthy();
  }

  /**
   * 验证面包屑导航
   */
  async expectBreadcrumb(expectedPath: string[]): Promise<void> {
    await expect(this.breadcrumb).toBeVisible();
    
    for (const pathItem of expectedPath) {
      const breadcrumbItem = this.breadcrumb.locator(`text=${pathItem}`);
      await expect(breadcrumbItem).toBeVisible();
    }
  }

  /**
   * 点击面包屑项
   */
  async clickBreadcrumbItem(itemText: string): Promise<void> {
    const breadcrumbItem = this.breadcrumb.locator(`text=${itemText}`);
    await breadcrumbItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击Logo
   */
  async clickLogo(): Promise<void> {
    await this.logo.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证Logo是否显示
   */
  async expectLogoVisible(): Promise<void> {
    await expect(this.logo).toBeVisible();
  }

  /**
   * 点击用户头像
   */
  async clickUserProfile(): Promise<void> {
    await this.userProfile.click();
    await expect(this.userDropdown).toBeVisible();
  }

  /**
   * 验证用户信息显示
   */
  async expectUserProfileVisible(userName?: string): Promise<void> {
    await expect(this.userProfile).toBeVisible();
    
    if (userName) {
      const userNameElement = this.userProfile.locator('[data-testid="user-name"], .user-name');
      await expect(userNameElement).toContainText(userName);
    }
  }

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    await this.clickUserProfile();
    await this.logoutButton.click();
    
    // 等待跳转到登录页面
    await this.page.waitForURL(/.*\/login/);
  }

  /**
   * 验证用户下拉菜单项
   */
  async expectUserDropdownItems(expectedItems: string[]): Promise<void> {
    await this.clickUserProfile();
    
    for (const item of expectedItems) {
      const menuItem = this.userDropdown.locator(`text=${item}`);
      await expect(menuItem).toBeVisible();
    }
  }

  /**
   * 点击用户下拉菜单项
   */
  async clickUserDropdownItem(itemText: string): Promise<void> {
    await this.clickUserProfile();
    
    const menuItem = this.userDropdown.locator(`text=${itemText}`);
    await menuItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证导航权限
   */
  async expectNavigationPermissions(allowedMenus: string[], deniedMenus: string[] = []): Promise<void> {
    // 验证允许访问的菜单项存在
    for (const menu of allowedMenus) {
      await this.expectMenuItemExists(menu);
    }
    
    // 验证禁止访问的菜单项不存在或禁用
    for (const menu of deniedMenus) {
      const menuItem = this.navigationMenu.locator(`text=${menu}`);
      const isVisible = await menuItem.isVisible().catch(() => false);
      
      if (isVisible) {
        await this.expectMenuItemDisabled(menu);
      }
    }
  }

  /**
   * 搜索菜单项
   */
  async searchMenuItem(searchTerm: string): Promise<string[]> {
    const allMenuItems = await this.menuItems.allTextContents();
    return allMenuItems.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * 验证移动端导航
   */
  async expectMobileNavigationVisible(): Promise<void> {
    await expect(this.mobileMenuButton).toBeVisible();
  }

  /**
   * 打开移动端菜单
   */
  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await expect(this.mobileMenu).toBeVisible();
  }

  /**
   * 关闭移动端菜单
   */
  async closeMobileMenu(): Promise<void> {
    if (await this.mobileMenuOverlay.isVisible()) {
      await this.mobileMenuOverlay.click();
    } else {
      await this.mobileMenuButton.click();
    }
    
    await expect(this.mobileMenu).not.toBeVisible();
  }

  /**
   * 验证响应式导航
   */
  async expectResponsiveNavigation(): Promise<void> {
    const viewport = this.page.viewportSize();
    
    if (viewport && viewport.width < 768) {
      // 移动端视图
      await this.expectMobileNavigationVisible();
    } else {
      // 桌面端视图
      await expect(this.navigationMenu).toBeVisible();
    }
  }

  /**
   * 获取当前激活的菜单项
   */
  async getCurrentActiveMenuItem(): Promise<string> {
    const activeMenuItem = this.navigationMenu.locator('.active, .selected, .ant-menu-item-selected').first();
    return await activeMenuItem.textContent() || '';
  }

  /**
   * 验证菜单层级结构
   */
  async expectMenuHierarchy(menuStructure: Record<string, string[]>): Promise<void> {
    for (const [parentMenu, subMenus] of Object.entries(menuStructure)) {
      // 验证父菜单存在
      await this.expectMenuItemExists(parentMenu);
      
      // 点击父菜单展开子菜单
      await this.clickMenuItem(parentMenu);
      
      // 验证子菜单项存在
      for (const subMenu of subMenus) {
        await this.expectMenuItemExists(subMenu);
      }
    }
  }

  /**
   * 验证菜单图标
   */
  async expectMenuItemIcon(menuText: string, iconClass?: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`).first();
    const icon = menuItem.locator('i, .icon, .ant-menu-item-icon').first();
    
    await expect(icon).toBeVisible();
    
    if (iconClass) {
      await expect(icon).toHaveClass(new RegExp(iconClass));
    }
  }

  /**
   * 验证菜单徽章/计数
   */
  async expectMenuItemBadge(menuText: string, expectedCount?: number): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`).first();
    const badge = menuItem.locator('.badge, .ant-badge, .menu-badge').first();
    
    await expect(badge).toBeVisible();
    
    if (expectedCount !== undefined) {
      await expect(badge).toContainText(expectedCount.toString());
    }
  }

  /**
   * 等待导航加载完成
   */
  async waitForNavigationLoad(): Promise<void> {
    await this.navigationMenu.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证导航主题
   */
  async expectNavigationTheme(theme: 'light' | 'dark'): Promise<void> {
    const themeClass = theme === 'dark' ? 'dark' : 'light';
    await expect(this.navigationMenu).toHaveClass(new RegExp(themeClass));
  }

  /**
   * 切换导航主题
   */
  async switchNavigationTheme(): Promise<void> {
    const themeToggle = this.page.locator('[data-testid="theme-toggle"], .theme-toggle');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await this.page.waitForTimeout(300); // 等待主题切换动画
    }
  }
}