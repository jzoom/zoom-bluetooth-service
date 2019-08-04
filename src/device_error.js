/**
 * 用于表示设备通讯错误
 *
 * 发生本异常，表示的是设备与app通信成功，但是数据发生异常
 */
export default class DeviceError extends Error {
  constructor(code, message = '') {
    super(message);
    this.code = code;
    this.isDevice = true;
  }

  toString() {
    return `DeviceError : [${this.code}]`;
  }

  static isDeviceError(e) {
    return e && e.isDevice === true;
  }
}


  /**
   * 数据发生异常
   */
DeviceError.DATA_ERROR = 'DATA_ERROR';

  /**
   * 发送命令超时
   */
DeviceError.IO_ERROR = 'IO_ERROR';
