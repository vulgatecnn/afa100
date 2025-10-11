// 员工通行记录页面逻辑
import EmployeeService from '../../../services/employee';
import { AccessRecord } from '../../../types/api';

interface RecordWithText extends AccessRecord {
  timeText: string;
  locationText: string;
}

interface TodayStats {
  total: number;
  inCount: number;
  outCount: number;
  successRate: number;
}

interface MonthlyStats {
  total: number;
  workDays: number;
  avgDaily: number;
  successRate: number;
  lastActivity: string;
}

interface DirectionOption {
  value: string;
  label: string;
}

interface PageData {
  records: RecordWithText[];
  filteredRecords: RecordWithText[];
  activeFilter: string;
  startDate: string;
  endDate: string;
  directionOptions: DirectionOption[];
  directionIndex: number;
  todayStats: TodayStats;
  monthlyStats: MonthlyStats;
  loading: boolean;
}

Page<PageData>({
  data: {
    records: [],
    filteredRecords: [],
    activeFilter: 'all',
    startDate: '',
    endDate: '',
    directionOptions: [
      { value: 'all', label: '全部方向' },
      { value: 'in', label: '进入' },
      { value: 'out', label: '离开' }
    ],
    directionIndex: 0,
    todayStats: {
      total: 0,
      inCount: 0,
      outCount: 0,
      successRate: 0
    },
    monthlyStats: {
      total: 0,
      workDays: 0,
      avgDaily: 0,
      successRate: 0,
      lastActivity: ''
    },
    loading: false
  },

  onLoad() {
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
      
      const records = await EmployeeService.getAccessHistory(
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
      const todayStats = this.calculateTodayStats(processedRecords);
      const monthlyStats = this.calculateMonthlyStats(processedRecords);
      
      this.setData({
        records: processedRecords,
        todayStats,
        monthlyStats
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

  // 方向筛选
  onDirectionChange(e: any) {
    this.setData({ directionIndex: e.detail.value });
    this.applyFilter();
  },

  // 应用筛选
  applyFilter() {
    const { records, activeFilter, directionOptions, directionIndex } = this.data;
    
    let filteredRecords = records;
    
    // 按结果筛选
    if (activeFilter === 'success') {
      filteredRecords = filteredRecords.filter(record => record.result === 'success');
    } else if (activeFilter === 'failed') {
      filteredRecords = filteredRecords.filter(record => record.result === 'failed');
    }
    
    // 按方向筛选
    const selectedDirection = directionOptions[directionIndex].value;
    if (selectedDirection !== 'all') {
      filteredRecords = filteredRecords.filter(record => record.direction === selectedDirection);
    }
    
    this.setData({ filteredRecords });
  },

  // 计算今日统计
  calculateTodayStats(records: RecordWithText[]): TodayStats {
    const today = new Date();
    const todayStr = this.formatDate(today);
    
    const todayRecords = records.filter(record => {
      const recordDate = this.formatDate(new Date(record.timestamp));
      return recordDate === todayStr;
    });
    
    const total = todayRecords.length;
    const inCount = todayRecords.filter(r => r.direction === 'in').length;
    const outCount = todayRecords.filter(r => r.direction === 'out').length;
    const successCount = todayRecords.filter(r => r.result === 'success').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    
    return { total, inCount, outCount, successRate };
  },

  // 计算月度统计
  calculateMonthlyStats(records: RecordWithText[]): MonthlyStats {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyRecords = records.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const total = monthlyRecords.length;
    const successCount = monthlyRecords.filter(r => r.result === 'success').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    
    // 计算工作天数（有通行记录的天数）
    const workDaysSet = new Set();
    monthlyRecords.forEach(record => {
      const recordDate = this.formatDate(new Date(record.timestamp));
      workDaysSet.add(recordDate);
    });
    const workDays = workDaysSet.size;
    
    const avgDaily = workDays > 0 ? Math.round(total / workDays) : 0;
    
    // 最近活跃时间
    let lastActivity = '';
    if (monthlyRecords.length > 0) {
      const latestRecord = monthlyRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      lastActivity = this.formatDateTime(latestRecord.timestamp);
    }
    
    return { total, workDays, avgDaily, successRate, lastActivity };
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