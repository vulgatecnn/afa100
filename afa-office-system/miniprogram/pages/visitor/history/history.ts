// 访客通行记录页面逻辑
import VisitorService from '../../../services/visitor';
import { AccessRecord } from '../../../types/api';

interface RecordWithText extends AccessRecord {
  timeText: string;
  locationText: string;
}

interface StatsData {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

interface PageData {
  applicationId: number;
  records: RecordWithText[];
  filteredRecords: RecordWithText[];
  activeFilter: string;
  startDate: string;
  endDate: string;
  stats: StatsData;
  loading: boolean;
}

Page<PageData>({
  data: {
    applicationId: 0,
    records: [],
    filteredRecords: [],
    activeFilter: 'all',
    startDate: '',
    endDate: '',
    stats: {
      total: 0,
      success: 0,
      failed: 0,
      successRate: 0
    },
    loading: false
  },

  onLoad(options: any) {
    const applicationId = parseInt(options.applicationId);
    this.setData({ applicationId });
    
    // 设置默认日期范围（最近30天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    this.setData({
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    });
    
    this.loadAccessHistory();
  },

  onPullDownRefresh() {
    this.loadAccessHistory().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载通行记录
  async loadAccessHistory() {
    try {
      this.setData({ loading: true });
      
      const records = await VisitorService.getAccessHistory(
        this.data.applicationId,
        this.data.startDate,
        this.data.endDate
      );
      
      // 处理记录数据
      const processedRecords = records.map(record => ({
        ...record,
        timeText: this.formatDateTime(record.timestamp),
        locationText: this.formatLocation(record.location)
      }));
      
      // 计算统计信息
      const stats = this.calculateStats(processedRecords);
      
      this.setData({
        records: processedRecords,
        stats
      });
      
      // 应用当前筛选
      this.applyFilter();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加载记录失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 筛选器切换
  onFilterChange(e: any) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter });
    this.applyFilter();
  },

  // 开始日期选择
  onStartDateChange(e: any) {
    this.setData({ startDate: e.detail.value });
    this.loadAccessHistory();
  },

  // 结束日期选择
  onEndDateChange(e: any) {
    this.setData({ endDate: e.detail.value });
    this.loadAccessHistory();
  },

  // 应用筛选
  applyFilter() {
    const { records, activeFilter } = this.data;
    
    let filteredRecords = records;
    
    if (activeFilter === 'success') {
      filteredRecords = records.filter(record => record.result === 'success');
    } else if (activeFilter === 'failed') {
      filteredRecords = records.filter(record => record.result === 'failed');
    }
    
    this.setData({ filteredRecords });
  },

  // 计算统计信息
  calculateStats(records: RecordWithText[]): StatsData {
    const total = records.length;
    const success = records.filter(r => r.result === 'success').length;
    const failed = total - success;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    return { total, success, failed, successRate };
  },

  // 格式化日期时间
  formatDateTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  },

  // 格式化日期
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },

  // 格式化位置信息
  formatLocation(location: any): string {
    if (!location) return '未知位置';
    
    // 这里应该根据实际的项目、场地、楼层信息来格式化
    // 暂时使用ID显示
    return `项目${location.projectId}-场地${location.venueId}-楼层${location.floorId}`;
  }
});