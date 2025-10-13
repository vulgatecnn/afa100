import { Page, Locator, expect } from '@playwright/test';

/**
 * 表格排序方向枚举
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
  NONE = 'none'
}

/**
 * 表格组件页面对象
 * 提供通用的表格操作和验证功能
 */
export class TableComponent {
  private readonly page: Page;

  // 表格容器
  readonly table: Locator;
  readonly tableWrapper: Locator;
  readonly tableContainer: Locator;

  // 表格结构
  readonly tableHeader: Locator;
  readonly tableBody: Locator;
  readonly tableFooter: Locator;
  readonly tableRows: Locator;
  readonly tableCells: Locator;
  readonly headerCells: Locator;

  // 表格功能
  readonly sortableHeaders: Locator;
  readonly filterInputs: Locator;
  readonly searchInput: Locator;
  readonly pagination: Locator;
  readonly pageSize: Locator;
  readonly totalCount: Locator;

  // 选择功能
  readonly selectAllCheckbox: Locator;
  readonly rowCheckboxes: Locator;
  readonly selectedRows: Locator;

  // 操作按钮
  readonly actionButtons: Locator;
  readonly editButtons: Locator;
  readonly deleteButtons: Locator;
  readonly viewButtons: Locator;

  // 加载和空状态
  readonly loadingSpinner: Locator;
  readonly emptyState: Locator;
  readonly noDataText: Locator;

  // 表格工具栏
  readonly toolbar: Locator;
  readonly refreshButton: Locator;
  readonly exportButton: Locator;
  readonly importButton: Locator;
  readonly addButton: Locator;

  // 列设置
  readonly columnSettings: Locator;
  readonly columnVisibilityToggles: Locator;
  readonly columnResizeHandles: Locator;

  constructor(page: Page, tableSelector?: string) {
    this.page = page;

    const baseSelector = tableSelector || '[data-testid="table"], .table, .ant-table';
    
    // 表格容器
    this.table = page.locator(baseSelector);
    this.tableWrapper = page.locator('[data-testid="table-wrapper"], .table-wrapper, .ant-table-wrapper');
    this.tableContainer = page.locator('[data-testid="table-container"], .table-container, .ant-table-container');

    // 表格结构
    this.tableHeader = page.locator('[data-testid="table-header"], thead, .ant-table-thead');
    this.tableBody = page.locator('[data-testid="table-body"], tbody, .ant-table-tbody');
    this.tableFooter = page.locator('[data-testid="table-footer"], tfoot, .ant-table-tfoot');
    this.tableRows = page.locator('[data-testid="table-row"], tr, .ant-table-row');
    this.tableCells = page.locator('[data-testid="table-cell"], td, .ant-table-cell');
    this.headerCells = page.locator('[data-testid="header-cell"], th, .ant-table-cell');

    // 表格功能
    this.sortableHeaders = page.locator('[data-testid="sortable-header"], .sortable, .ant-table-column-sorter');
    this.filterInputs = page.locator('[data-testid="filter-input"], .filter-input, .ant-table-filter-dropdown');
    this.searchInput = page.locator('[data-testid="search-input"], .search-input');
    this.pagination = page.locator('[data-testid="pagination"], .pagination, .ant-pagination');
    this.pageSize = page.locator('[data-testid="page-size"], .page-size, .ant-pagination-options-size-changer');
    this.totalCount = page.locator('[data-testid="total-count"], .total-count, .ant-pagination-total-text');

    // 选择功能
    this.selectAllCheckbox = page.locator('[data-testid="select-all"], .select-all, .ant-table-selection-select-all-custom');
    this.rowCheckboxes = page.locator('[data-testid="row-checkbox"], .row-checkbox, .ant-table-selection-column input');
    this.selectedRows = page.locator('[data-testid="selected-row"], .selected-row, .ant-table-row-selected');

    // 操作按钮
    this.actionButtons = page.locator('[data-testid*="action"], .action-button');
    this.editButtons = page.locator('[data-testid="edit-button"], .edit-button');
    this.deleteButtons = page.locator('[data-testid="delete-button"], .delete-button');
    this.viewButtons = page.locator('[data-testid="view-button"], .view-button');

    // 加载和空状态
    this.loadingSpinner = page.locator('[data-testid="table-loading"], .table-loading, .ant-spin');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state, .ant-empty');
    this.noDataText = page.locator('[data-testid="no-data"], .no-data, .ant-empty-description');

    // 表格工具栏
    this.toolbar = page.locator('[data-testid="table-toolbar"], .table-toolbar');
    this.refreshButton = page.locator('[data-testid="refresh-button"], .refresh-button');
    this.exportButton = page.locator('[data-testid="export-button"], .export-button');
    this.importButton = page.locator('[data-testid="import-button"], .import-button');
    this.addButton = page.locator('[data-testid="add-button"], .add-button');

    // 列设置
    this.columnSettings = page.locator('[data-testid="column-settings"], .column-settings');
    this.columnVisibilityToggles = page.locator('[data-testid="column-toggle"], .column-toggle');
    this.columnResizeHandles = page.locator('[data-testid="resize-handle"], .resize-handle, .ant-table-resize-handle');
  }

  /**
   * 等待表格加载完成
   */
  async waitForTableLoad(timeout = 10000): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout });
    
    // 等待加载指示器消失
    try {
      await this.loadingSpinner.waitFor({ state: 'visible', timeout: 2000 });
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // 如果没有加载指示器，直接继续
    }
  }

  /**
   * 验证表格是否可见
   */
  async expectTableVisible(): Promise<void> {
    await expect(this.table).toBeVisible();
  }

  /**
   * 获取表格行数
   */
  async getRowCount(): Promise<number> {
    await this.waitForTableLoad();
    return await this.tableRows.count();
  }

  /**
   * 获取表格列数
   */
  async getColumnCount(): Promise<number> {
    await this.waitForTableLoad();
    const firstRow = this.tableRows.first();
    return await firstRow.locator('td, th').count();
  }

  /**
   * 获取指定行的数据
   */
  async getRowData(rowIndex: number): Promise<string[]> {
    await this.waitForTableLoad();
    const row = this.tableRows.nth(rowIndex);
    const cells = row.locator('td');
    const count = await cells.count();
    const data: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const cellText = await cells.nth(i).textContent();
      data.push(cellText?.trim() || '');
    }
    
    return data;
  }

  /**
   * 获取指定列的数据
   */
  async getColumnData(columnIndex: number): Promise<string[]> {
    await this.waitForTableLoad();
    const cells = this.tableBody.locator(`tr td:nth-child(${columnIndex + 1})`);
    const count = await cells.count();
    const data: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const cellText = await cells.nth(i).textContent();
      data.push(cellText?.trim() || '');
    }
    
    return data;
  }

  /**
   * 获取单元格数据
   */
  async getCellData(rowIndex: number, columnIndex: number): Promise<string> {
    await this.waitForTableLoad();
    const cell = this.tableRows.nth(rowIndex).locator('td').nth(columnIndex);
    return await cell.textContent() || '';
  }

  /**
   * 验证单元格内容
   */
  async expectCellContent(rowIndex: number, columnIndex: number, expectedContent: string): Promise<void> {
    const cellContent = await this.getCellData(rowIndex, columnIndex);
    expect(cellContent.trim()).toBe(expectedContent);
  }

  /**
   * 验证行数据
   */
  async expectRowData(rowIndex: number, expectedData: string[]): Promise<void> {
    const rowData = await this.getRowData(rowIndex);
    expect(rowData).toEqual(expectedData);
  }

  /**
   * 查找包含特定文本的行
   */
  async findRowByText(text: string): Promise<number> {
    await this.waitForTableLoad();
    const rows = this.tableRows;
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent();
      if (rowText?.includes(text)) {
        return i;
      }
    }
    
    return -1; // 未找到
  }

  /**
   * 验证行是否存在
   */
  async expectRowExists(text: string): Promise<void> {
    const rowIndex = await this.findRowByText(text);
    expect(rowIndex).toBeGreaterThanOrEqual(0);
  }

  /**
   * 验证行不存在
   */
  async expectRowNotExists(text: string): Promise<void> {
    const rowIndex = await this.findRowByText(text);
    expect(rowIndex).toBe(-1);
  }

  /**
   * 点击表头进行排序
   */
  async sortByColumn(columnIndex: number): Promise<void> {
    await this.waitForTableLoad();
    const headerCell = this.headerCells.nth(columnIndex);
    await headerCell.click();
    await this.waitForTableLoad();
  }

  /**
   * 验证列排序状态
   */
  async expectColumnSorted(columnIndex: number, direction: SortDirection): Promise<void> {
    await this.waitForTableLoad();
    const headerCell = this.headerCells.nth(columnIndex);
    
    if (direction === SortDirection.NONE) {
      const sortClass = await headerCell.getAttribute('class') || '';
      expect(sortClass).not.toMatch(/sort|asc|desc/);
    } else {
      const sortClass = await headerCell.getAttribute('class') || '';
      expect(sortClass).toContain(direction);
    }
  }

  /**
   * 验证数据排序正确性
   */
  async expectDataSorted(columnIndex: number, direction: SortDirection): Promise<void> {
    if (direction === SortDirection.NONE) return;
    
    const columnData = await this.getColumnData(columnIndex);
    const sortedData = [...columnData].sort();
    
    if (direction === SortDirection.DESC) {
      sortedData.reverse();
    }
    
    expect(columnData).toEqual(sortedData);
  }

  /**
   * 选择所有行
   */
  async selectAllRows(): Promise<void> {
    await this.waitForTableLoad();
    await this.selectAllCheckbox.check();
  }

  /**
   * 取消选择所有行
   */
  async unselectAllRows(): Promise<void> {
    await this.waitForTableLoad();
    await this.selectAllCheckbox.uncheck();
  }

  /**
   * 选择指定行
   */
  async selectRow(rowIndex: number): Promise<void> {
    await this.waitForTableLoad();
    const checkbox = this.tableRows.nth(rowIndex).locator('input[type="checkbox"]');
    await checkbox.check();
  }

  /**
   * 取消选择指定行
   */
  async unselectRow(rowIndex: number): Promise<void> {
    await this.waitForTableLoad();
    const checkbox = this.tableRows.nth(rowIndex).locator('input[type="checkbox"]');
    await checkbox.uncheck();
  }

  /**
   * 获取选中行数量
   */
  async getSelectedRowCount(): Promise<number> {
    await this.waitForTableLoad();
    return await this.selectedRows.count();
  }

  /**
   * 验证行选中状态
   */
  async expectRowSelected(rowIndex: number, selected: boolean): Promise<void> {
    await this.waitForTableLoad();
    const row = this.tableRows.nth(rowIndex);
    const checkbox = row.locator('input[type="checkbox"]');
    
    if (selected) {
      await expect(checkbox).toBeChecked();
    } else {
      await expect(checkbox).not.toBeChecked();
    }
  }

  /**
   * 点击行操作按钮
   */
  async clickRowAction(rowIndex: number, action: string): Promise<void> {
    await this.waitForTableLoad();
    const row = this.tableRows.nth(rowIndex);
    const actionButton = row.locator(`[data-testid="${action}-button"], .${action}-button`);
    await actionButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 编辑行
   */
  async editRow(rowIndex: number): Promise<void> {
    await this.clickRowAction(rowIndex, 'edit');
  }

  /**
   * 删除行
   */
  async deleteRow(rowIndex: number): Promise<void> {
    await this.clickRowAction(rowIndex, 'delete');
  }

  /**
   * 查看行详情
   */
  async viewRow(rowIndex: number): Promise<void> {
    await this.clickRowAction(rowIndex, 'view');
  }

  /**
   * 切换到指定页码
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.waitForTableLoad();
    const pageButton = this.pagination.locator(`text=${pageNumber}`);
    await pageButton.click();
    await this.waitForTableLoad();
  }

  /**
   * 下一页
   */
  async nextPage(): Promise<void> {
    await this.waitForTableLoad();
    const nextButton = this.pagination.locator('[data-testid="next"], .ant-pagination-next');
    await nextButton.click();
    await this.waitForTableLoad();
  }

  /**
   * 上一页
   */
  async previousPage(): Promise<void> {
    await this.waitForTableLoad();
    const prevButton = this.pagination.locator('[data-testid="prev"], .ant-pagination-prev');
    await prevButton.click();
    await this.waitForTableLoad();
  }

  /**
   * 设置每页显示数量
   */
  async setPageSize(size: number): Promise<void> {
    await this.waitForTableLoad();
    await this.pageSize.selectOption(size.toString());
    await this.waitForTableLoad();
  }

  /**
   * 获取总记录数
   */
  async getTotalCount(): Promise<number> {
    await this.waitForTableLoad();
    const totalText = await this.totalCount.textContent();
    const match = totalText?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * 验证分页信息
   */
  async expectPaginationInfo(currentPage: number, totalPages: number, totalItems: number): Promise<void> {
    await this.waitForTableLoad();
    
    // 验证当前页
    const currentPageElement = this.pagination.locator('.ant-pagination-item-active, .current');
    await expect(currentPageElement).toContainText(currentPage.toString());
    
    // 验证总记录数
    const actualTotal = await this.getTotalCount();
    expect(actualTotal).toBe(totalItems);
  }

  /**
   * 搜索表格数据
   */
  async searchTable(searchTerm: string): Promise<void> {
    await this.waitForTableLoad();
    await this.searchInput.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForTableLoad();
  }

  /**
   * 清空搜索
   */
  async clearSearch(): Promise<void> {
    await this.waitForTableLoad();
    await this.searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.waitForTableLoad();
  }

  /**
   * 刷新表格
   */
  async refreshTable(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForTableLoad();
  }

  /**
   * 导出表格数据
   */
  async exportTable(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * 验证表格为空
   */
  async expectEmptyTable(): Promise<void> {
    await this.waitForTableLoad();
    await expect(this.emptyState).toBeVisible();
    await expect(this.noDataText).toBeVisible();
  }

  /**
   * 验证表格有数据
   */
  async expectTableHasData(): Promise<void> {
    await this.waitForTableLoad();
    const rowCount = await this.getRowCount();
    expect(rowCount).toBeGreaterThan(0);
  }

  /**
   * 验证加载状态
   */
  async expectLoadingState(isLoading: boolean): Promise<void> {
    if (isLoading) {
      await expect(this.loadingSpinner).toBeVisible();
    } else {
      await expect(this.loadingSpinner).not.toBeVisible();
    }
  }

  /**
   * 验证表格列标题
   */
  async expectColumnHeaders(expectedHeaders: string[]): Promise<void> {
    await this.waitForTableLoad();
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      const headerCell = this.headerCells.nth(i);
      await expect(headerCell).toContainText(expectedHeaders[i]);
    }
  }

  /**
   * 调整列宽
   */
  async resizeColumn(columnIndex: number, newWidth: number): Promise<void> {
    await this.waitForTableLoad();
    
    const resizeHandle = this.columnResizeHandles.nth(columnIndex);
    if (await resizeHandle.isVisible()) {
      const initialBox = await resizeHandle.boundingBox();
      
      if (initialBox) {
        await resizeHandle.dragTo(resizeHandle, {
          targetPosition: { x: initialBox.x + newWidth, y: initialBox.y }
        });
      }
    }
  }

  /**
   * 切换列可见性
   */
  async toggleColumnVisibility(columnName: string): Promise<void> {
    await this.columnSettings.click();
    
    const columnToggle = this.columnVisibilityToggles.locator(`text=${columnName}`);
    await columnToggle.click();
    
    // 关闭列设置面板
    await this.page.keyboard.press('Escape');
    await this.waitForTableLoad();
  }

  /**
   * 验证列是否可见
   */
  async expectColumnVisible(columnName: string, visible: boolean): Promise<void> {
    await this.waitForTableLoad();
    
    const headerCell = this.headerCells.locator(`text=${columnName}`);
    
    if (visible) {
      await expect(headerCell).toBeVisible();
    } else {
      await expect(headerCell).not.toBeVisible();
    }
  }

  /**
   * 验证表格响应式
   */
  async expectResponsiveTable(): Promise<void> {
    const viewport = this.page.viewportSize();
    
    if (viewport && viewport.width < 768) {
      // 移动端视图 - 可能有横向滚动或卡片布局
      const scrollContainer = this.table.locator('.ant-table-body, .table-scroll');
      if (await scrollContainer.isVisible()) {
        const scrollWidth = await scrollContainer.evaluate(el => el.scrollWidth);
        const clientWidth = await scrollContainer.evaluate(el => el.clientWidth);
        expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);
      }
    }
  }

  /**
   * 验证表格固定列
   */
  async expectFixedColumns(): Promise<void> {
    await this.waitForTableLoad();
    
    const fixedColumns = this.table.locator('.ant-table-fixed-left, .ant-table-fixed-right, .fixed-column');
    const count = await fixedColumns.count();
    
    if (count > 0) {
      // 验证固定列的样式
      for (let i = 0; i < count; i++) {
        const column = fixedColumns.nth(i);
        const position = await column.evaluate(el => getComputedStyle(el).position);
        expect(position).toBe('sticky');
      }
    }
  }
}