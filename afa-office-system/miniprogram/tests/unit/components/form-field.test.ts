// 表单字段组件单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, createMockComponent } from '../../setup';

describe('表单字段组件测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('组件初始化', () => {
    it('应该有正确的初始属性和数据', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          label: '',
          value: '',
          placeholder: '请输入',
          type: 'text', // text, number, password, textarea, picker
          required: false,
          disabled: false,
          maxlength: -1,
          rules: []
        },
        data: {
          focused: false,
          error: '',
          showError: false,
          internalValue: ''
        }
      });

      expect(formFieldComponent.properties.label).toBe('');
      expect(formFieldComponent.properties.type).toBe('text');
      expect(formFieldComponent.properties.required).toBe(false);
      expect(formFieldComponent.properties.disabled).toBe(false);
      expect(formFieldComponent.data.focused).toBe(false);
      expect(formFieldComponent.data.error).toBe('');
    });
  });

  describe('组件生命周期', () => {
    it('应该在attached时初始化内部值', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '初始值'
        },
        data: {
          internalValue: ''
        },
        attached() {
          this.setData({
            internalValue: this.properties.value
          });
        }
      });

      formFieldComponent.attached();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        internalValue: '初始值'
      });
    });

    it('应该在ready时进行初始验证', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '',
          required: true
        },
        methods: {
          validate() {
            if (this.properties.required && !this.properties.value.trim()) {
              this.setData({
                error: '此字段为必填项',
                showError: true
              });
              return false;
            }
            return true;
          }
        },
        ready() {
          // 初始验证（静默）
          this.validate();
        }
      });

      formFieldComponent.ready();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '此字段为必填项',
        showError: true
      });
    });
  });

  describe('属性变化监听', () => {
    it('应该监听value属性变化并同步内部值', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '旧值'
        },
        data: {
          internalValue: '旧值'
        },
        observers: {
          'value': function(newValue) {
            if (newValue !== this.data.internalValue) {
              this.setData({ internalValue: newValue });
              this.clearError();
            }
          }
        },
        methods: {
          clearError() {
            this.setData({
              error: '',
              showError: false
            });
          }
        }
      });

      formFieldComponent.observers.value.call(formFieldComponent, '新值');

      expect(formFieldComponent.setData).toHaveBeenCalledWith({ internalValue: '新值' });
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '',
        showError: false
      });
    });

    it('应该监听rules属性变化并重新验证', () => {
      const validateSpy = vi.fn();
      const formFieldComponent = createMockComponent({
        properties: {
          value: 'test',
          rules: []
        },
        methods: {
          validate: validateSpy
        },
        observers: {
          'rules': function(newRules) {
            if (newRules && newRules.length > 0) {
              this.validate();
            }
          }
        }
      });

      const newRules = [{ required: true, message: '必填' }];
      formFieldComponent.observers.rules.call(formFieldComponent, newRules);

      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('输入事件处理', () => {
    it('应该处理输入事件并更新值', () => {
      const formFieldComponent = createMockComponent({
        data: {
          internalValue: '',
          error: '之前的错误',
          showError: true
        },
        methods: {
          onInput(e) {
            const value = e.detail.value;
            this.setData({
              internalValue: value,
              error: '',
              showError: false
            });
            
            // 触发外部事件
            this.triggerEvent('input', { value });
          }
        }
      });

      const mockEvent = {
        detail: { value: '新输入值' }
      };

      formFieldComponent.onInput(mockEvent);

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        internalValue: '新输入值',
        error: '',
        showError: false
      });
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('input', {
        value: '新输入值'
      });
    });

    it('应该处理焦点事件', () => {
      const validateSpy = vi.fn();
      const formFieldComponent = createMockComponent({
        data: {
          focused: false
        },
        methods: {
          onFocus(e) {
            this.setData({ focused: true });
            this.triggerEvent('focus', e.detail);
          },
          onBlur(e) {
            this.setData({ focused: false });
            this.validate();
            this.triggerEvent('blur', e.detail);
          },
          validate: validateSpy
        }
      });

      // 测试获得焦点
      formFieldComponent.onFocus({ detail: {} });
      expect(formFieldComponent.setData).toHaveBeenCalledWith({ focused: true });
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('focus', {});

      // 测试失去焦点
      formFieldComponent.onBlur({ detail: {} });
      expect(formFieldComponent.setData).toHaveBeenCalledWith({ focused: false });
      expect(validateSpy).toHaveBeenCalled();
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('blur', {});
    });
  });

  describe('表单验证', () => {
    it('应该验证必填字段', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '',
          required: true,
          label: '用户名'
        },
        data: {
          error: '',
          showError: false
        },
        methods: {
          validate() {
            if (this.properties.required && !this.properties.value.trim()) {
              const message = `${this.properties.label || '此字段'}为必填项`;
              this.setData({
                error: message,
                showError: true
              });
              return false;
            }
            
            this.setData({
              error: '',
              showError: false
            });
            return true;
          }
        }
      });

      const result = formFieldComponent.validate();

      expect(result).toBe(false);
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '用户名为必填项',
        showError: true
      });
    });

    it('应该验证字段长度', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '12',
          rules: [
            { min: 3, message: '最少3个字符' },
            { max: 10, message: '最多10个字符' }
          ]
        },
        data: {
          error: '',
          showError: false
        },
        methods: {
          validate() {
            const value = this.properties.value;
            const rules = this.properties.rules;
            
            for (const rule of rules) {
              if (rule.min && value.length < rule.min) {
                this.setData({
                  error: rule.message,
                  showError: true
                });
                return false;
              }
              
              if (rule.max && value.length > rule.max) {
                this.setData({
                  error: rule.message,
                  showError: true
                });
                return false;
              }
            }
            
            this.setData({
              error: '',
              showError: false
            });
            return true;
          }
        }
      });

      const result = formFieldComponent.validate();

      expect(result).toBe(false);
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '最少3个字符',
        showError: true
      });
    });

    it('应该验证正则表达式', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '123456',
          rules: [
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
          ]
        },
        data: {
          error: '',
          showError: false
        },
        methods: {
          validate() {
            const value = this.properties.value;
            const rules = this.properties.rules;
            
            for (const rule of rules) {
              if (rule.pattern && !rule.pattern.test(value)) {
                this.setData({
                  error: rule.message,
                  showError: true
                });
                return false;
              }
            }
            
            this.setData({
              error: '',
              showError: false
            });
            return true;
          }
        }
      });

      const result = formFieldComponent.validate();

      expect(result).toBe(false);
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '请输入正确的手机号',
        showError: true
      });
    });

    it('应该支持自定义验证函数', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: 'test123',
          rules: [
            {
              validator: (value) => {
                return !value.includes('admin');
              },
              message: '用户名不能包含admin'
            }
          ]
        },
        data: {
          error: '',
          showError: false
        },
        methods: {
          validate() {
            const value = this.properties.value;
            const rules = this.properties.rules;
            
            for (const rule of rules) {
              if (rule.validator && !rule.validator(value)) {
                this.setData({
                  error: rule.message,
                  showError: true
                });
                return false;
              }
            }
            
            this.setData({
              error: '',
              showError: false
            });
            return true;
          }
        }
      });

      // 修改值包含admin
      formFieldComponent.properties.value = 'admin123';
      const result = formFieldComponent.validate();

      expect(result).toBe(false);
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '用户名不能包含admin',
        showError: true
      });
    });

    it('应该通过所有验证规则', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          value: '13800138000',
          required: true,
          rules: [
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
          ]
        },
        data: {
          error: 'previous error',
          showError: true
        },
        methods: {
          validate() {
            const value = this.properties.value;
            
            // 必填验证
            if (this.properties.required && !value.trim()) {
              this.setData({
                error: '此字段为必填项',
                showError: true
              });
              return false;
            }
            
            // 规则验证
            const rules = this.properties.rules;
            for (const rule of rules) {
              if (rule.pattern && !rule.pattern.test(value)) {
                this.setData({
                  error: rule.message,
                  showError: true
                });
                return false;
              }
            }
            
            this.setData({
              error: '',
              showError: false
            });
            return true;
          }
        }
      });

      const result = formFieldComponent.validate();

      expect(result).toBe(true);
      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '',
        showError: false
      });
    });
  });

  describe('样式计算', () => {
    it('应该根据状态计算输入框样式', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          disabled: false
        },
        data: {
          focused: true,
          showError: true,
          inputClass: ''
        },
        methods: {
          computeInputClass() {
            const baseClass = 'form-field__input';
            const focusClass = this.data.focused ? 'form-field__input--focused' : '';
            const errorClass = this.data.showError ? 'form-field__input--error' : '';
            const disabledClass = this.properties.disabled ? 'form-field__input--disabled' : '';
            
            const classes = [baseClass, focusClass, errorClass, disabledClass]
              .filter(cls => cls)
              .join(' ');
            
            this.setData({ inputClass: classes });
          }
        }
      });

      formFieldComponent.computeInputClass();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        inputClass: 'form-field__input form-field__input--focused form-field__input--error'
      });
    });

    it('应该计算标签样式', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          required: true
        },
        data: {
          labelClass: ''
        },
        methods: {
          computeLabelClass() {
            const baseClass = 'form-field__label';
            const requiredClass = this.properties.required ? 'form-field__label--required' : '';
            
            const classes = [baseClass, requiredClass]
              .filter(cls => cls)
              .join(' ');
            
            this.setData({ labelClass: classes });
          }
        }
      });

      formFieldComponent.computeLabelClass();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        labelClass: 'form-field__label form-field__label--required'
      });
    });
  });

  describe('工具方法', () => {
    it('应该清除错误状态', () => {
      const formFieldComponent = createMockComponent({
        data: {
          error: '错误信息',
          showError: true
        },
        methods: {
          clearError() {
            this.setData({
              error: '',
              showError: false
            });
          }
        }
      });

      formFieldComponent.clearError();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        error: '',
        showError: false
      });
    });

    it('应该重置字段值', () => {
      const formFieldComponent = createMockComponent({
        data: {
          internalValue: '当前值',
          error: '错误信息',
          showError: true,
          focused: true
        },
        methods: {
          reset() {
            this.setData({
              internalValue: '',
              error: '',
              showError: false,
              focused: false
            });
            
            this.triggerEvent('reset');
          }
        }
      });

      formFieldComponent.reset();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        internalValue: '',
        error: '',
        showError: false,
        focused: false
      });
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('reset');
    });

    it('应该获取字段值', () => {
      const formFieldComponent = createMockComponent({
        data: {
          internalValue: '字段值'
        },
        methods: {
          getValue() {
            return this.data.internalValue;
          }
        }
      });

      const value = formFieldComponent.getValue();

      expect(value).toBe('字段值');
    });

    it('应该设置字段值', () => {
      const formFieldComponent = createMockComponent({
        data: {
          internalValue: '旧值'
        },
        methods: {
          setValue(value) {
            this.setData({ internalValue: value });
            this.triggerEvent('change', { value });
          }
        }
      });

      formFieldComponent.setValue('新值');

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        internalValue: '新值'
      });
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('change', {
        value: '新值'
      });
    });
  });

  describe('不同字段类型', () => {
    it('应该处理文本域类型', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          type: 'textarea',
          maxlength: 200
        },
        data: {
          internalValue: '多行文本内容',
          characterCount: 0
        },
        methods: {
          updateCharacterCount() {
            this.setData({
              characterCount: this.data.internalValue.length
            });
          }
        }
      });

      formFieldComponent.updateCharacterCount();

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        characterCount: 6
      });
    });

    it('应该处理数字类型', () => {
      const formFieldComponent = createMockComponent({
        properties: {
          type: 'number'
        },
        methods: {
          onInput(e) {
            let value = e.detail.value;
            
            // 数字类型只允许数字
            if (this.properties.type === 'number') {
              value = value.replace(/[^\d]/g, '');
            }
            
            this.setData({ internalValue: value });
            this.triggerEvent('input', { value });
          }
        }
      });

      const mockEvent = {
        detail: { value: 'abc123def' }
      };

      formFieldComponent.onInput(mockEvent);

      expect(formFieldComponent.setData).toHaveBeenCalledWith({
        internalValue: '123'
      });
      expect(formFieldComponent.triggerEvent).toHaveBeenCalledWith('input', {
        value: '123'
      });
    });
  });
});