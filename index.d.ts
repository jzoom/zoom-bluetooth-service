/**
 * 
 * 本库用于抽象蓝牙设备的生命周期：
 * 1、连接与连接管理
 * 2、数据包的发送与解析
 * 其中与蓝牙设备的具体用途无关
 * 
 * 
 * 本库适用于 rn、taro、小程序
 * 
 * 
 * 设备启动完毕之后向设备发送命令有两种模式
 * 
 * 1、被动型
 * 即为发送命令完毕之后，等待之前的通知特征值的回调
 * 
 * 2、主动型
 * 发送命令之后，主动读取可读特征值的值
 * 
 * 3、主动型（经典蓝牙）
 * 发送命令之后，主动读取socket
 * 
 * 
 * 对于低功耗蓝牙
 * 
 * 当设置了设备配置的 serviceId和 notifyId(通知特征id)之后，认为是被动型
 * 当设置了设备配置的 serviceId和 readId(读取特征id)之后，认为是主动型
 * 两种都必须提供writeId (写入特征id)
 * 
 * 而对于经典蓝牙
 * 需要配置mac地址与serviceId
 * 
 * 
 * 
 * 
 * 
 */

/**
 * 扫描出来的原始设备，比如小程序中的扫描结果
 */
declare interface RawDevice{
  /**
   * 设备名称
   */
  name:string;

  /**
   * 设备id
   */
  deviceId:string;

}


declare interface BluetoothDevice extends RawDevice{

  /**
   * 用于向设备缓冲区写入数据，可以暂时将获取到的数据保存在这里
   * 一般来说，如果获取到了数据，而这个数据是不完整的包，则可以先将不完整的包暂时存在设备缓冲区，等待取到了完整的包之后，即可对全包进行处理，
   * 之后需要清空设备缓冲区，以便接收下一个包。
   * 
   * @param value 
   */
  appendValue(value:ArrayBuffer|Uint8Array):void;

  /**
   * 获取所有缓冲区数据
   */
  getValue():Uint8Array;

  /**
   * 清除缓冲区数据
   */
  clear():void;

  /**
   * 关闭连接，清理内存
   */
  close():Promise<any>;


  /**
   * 设置tag，可以存放任意内容
   * @param value 
   */
  setTag(value:any):void;

  /**
   * 获取存放的tag，任意内容
   */
  getTag():any;

  //device的write方法，当完成写入一个命令的时候，需要等待返回或者抛出错误s
  write(command:ArrayBuffer|Uint8Array|string):Promise<ArrayBuffer|Uint8Array|string>;
}

/**
 * 经典蓝牙
 */
declare interface ClassicBluetoothDevice extends BluetoothDevice{

  createSocket():Promise<any>;
  closeSocket():Promise<any>;
}

declare type SetNotifyParam = {
  serviceId:string;
  characteristicsId:string;
  value:boolean;
};

declare type Pack = ArrayBuffer | Uint8Array | string;

declare type CharacteristicsValue = {
  value:ArrayBuffer,
};



/**
 * 低功耗蓝牙
 */
declare interface BleDevice extends BluetoothDevice{ 

  createConnection():Promise<any>;

  closeConnection():Promise<any>;

  getServices():Promise<any>;

  getCharacteristics():Promise<any>;

  setNotify(param:SetNotifyParam):Promise<any>;
  
  onValueChange(callback:(param:CharacteristicsValue)=>void):void;
  
}


/**
 * 设备配置
 */
declare interface DeviceConfig{

  /**
   * 低功耗蓝牙配置
   */
  notifyId?:string;
  readId?:string;
  serviceId?:string;
  writeId?:string;

  /**
   * 经典蓝牙配置
   */
  mac:string;


  /**
   * 将扫描结果进行验证，如果符合本设备配置的要求，则返回true，
   * 一般来说，根据device的名称来进行判断 
   */
  filter(device:RawDevice):boolean;

  /**
   * 创建实际设备
   * @param device 
   */
  onCreateDevice(service:BleService,device:RawDevice):BluetoothDevice;

  /**
   * 如何启动
   * @param device 
   */
  onStartup(service:BleService,device:BluetoothDevice):Promise<any>;

  /**
   * 如何关闭
   * @param device 
   */
  onShutdown(service:BleService,device:BluetoothDevice):Promise<any>;

  /**
   * 当获取到一个包的时候
   * 需要对这个包进行解析
   * 假如这个包不全，则要等待下一个包，此时可以返回true系统可以根据返回值判断是否要进行再次读取
   * 假如这个包是全的，则返回true即可
   * 在解析出包的数据之后，将解析的结果投入success回调，本回调的结果将在device的write方法返回
   * 如果在解析包的时候产生异常,则直接抛出这个异常即可
   *  
   * 这里需要注意的有如下几种情况：
   * 1、半包的处理
   * 2、多包的处理，理论上不会有，如果多包了，则多半是错误的
   * 3、全包的处理
   * 
   * device的write方法，当完成写入一个命令的时候，需要等待返回或者抛出错误
   */
  onValueChange(device:BluetoothDevice,pack:ArrayBuffer,success:(result:any)=>void):Pack;

  /**
   * 加入有一些其他的通知，如设备主动上报等则通过这个回调来处理
   * @param pack 
   */
  onGetExtraPack(device:BluetoothDevice,pack:Pack):void;
}





declare class BleService{

  /**
   * 构造函数需要提供设备配置
   * @param configs 
   */
  constructor(configs:Array<DeviceConfig>);

  /**
   * 开始扫描设备
   */
  startScan():Promise<any>;

  /**
   * 停止扫描设备
   */
  stopScan():Promise<any>;

  /**
   * 关闭所有连接的设备
   */
  close():Promise<any>;

  /**
   * 设备找到之后的回调
   * 在回调内，需要返回一个BluetoothDevice
   * 因为扫描出来的设备，可能支持低功耗蓝牙，也可能仅支持经典蓝牙，
   * 
   * 
   * @param device 
   */
  onDeviceFound(callback:(device:BluetoothDevice)=>void):void;

  /**
   * 使用设备号，启动蓝牙设备，可同时启动多个设备的连接,这些连接可以在close方法中一并关闭
   * 实际上是调用config的onCreateDevice返回一个创建的设备，并调用config的onStartup方法
   * @param deviceId 
   */
  startupDevice(deviceId:string):Promise<any>;


  /**
   * 创建一个低功耗蓝牙设备
   * @param device 
   */
  createBleDevice(device:RawDevice):BleDevice;

  /**
   * 创建一个经典蓝牙设备
   * @param device 
   */
  createClassicBluetoothDevice(device:RawDevice):ClassicBluetoothDevice;

  /**
   * 根据id找到设备
   * @param deviceId 
   */
  getDeviceById(deviceId:string):BluetoothDevice;

}


declare class DeviceError{

}
export {DeviceError};
export default BleService;