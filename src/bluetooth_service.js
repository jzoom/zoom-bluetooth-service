
import {split,str2hex, hex2str} from 'zoom-hex';
import DeviceError from './device_error';

var bluetoothAdapter;


const MAX_DATE_LEN = 512;

class DeviceBuffer{

  constructor(bufferSize){
    this.bufferSize = bufferSize;
     //用于接收数据，一般来说设备的数据大小不会超过512字节
     this.cache = new Uint8Array(bufferSize);
     this.pointer = 0;
  }

   /**
   * 用于接收数据，比如一开始接收到了半包，这里可以将半包进行合并
   * 如果是ArrayBuffer，那么显然需要进行拷贝数据
   * @param {*} value value无非两种，一种是string，一种是ArrayBuffer
   */
  appendValue(value){
    var buffer;
    if(value instanceof ArrayBuffer){
      buffer = new Uint8Array(value);
    }else{
      buffer = str2bytes(value);
    }
    //直接拷贝进去
    if (this.pointer + buffer.length > this.bufferSize) {
      throw new DeviceError(DeviceError.DATA_ERROR);
    }
    this.cache.set(buffer, this.pointer);
    this.pointer += buffer.length;
  }

  /**
   * 直接获取缓冲区
   */
  getValue(){
    return new Uint8Array(this.cache.slice(0, this.pointer));
  }

  /**
   * 将值切割出来,等于清空缓冲区
   */
  splitValue(){
    try{
      return new Uint8Array(this.cache.slice(0, this.pointer));
    }finally{
      this.clear();
    }
  }

  /**
   * 清空缓冲区
   */
  clear(){
    this.pointer = 0;
  }

}

class BluetoothDevice{
  constructor(device){
    this.deviceId = device.deviceId;
    this.name = device.name;
    this.buffer = new DeviceBuffer(MAX_DATE_LEN);
  }

  setTag(value){
    this.tag = value;
  }

  getTag(){
    return this.tag;
  }

  appendValue(value){
    this.buffer.appendValue(value);
  }

  getValue(){
    return this.buffer.getValue();
  }

  clear(){
    this.buffer.clear();
  }

  splitValue(){
    return this.buffer.splitValue();
  }

  setConfig(config){
    this.config = config;
  }

}

class BleDevice extends BluetoothDevice{
  constructor(device){
    super(device);
    this.timeout = 6000;
  }

  async close(){
    await this.closeConnection();
  }

  setConfig(config){
    super.setConfig(config);
    this.serviceId = config.serviceId;
    this.notifyId = config.notifyId;
    this.writeId = config.writeId;
  }

  async startup(){
    //建立连接
    await this.createConnection();
    //发现服务
    var services = await this.getServices();
    console.log(services);
    for(var i in services){
      var service = services[i];
      var characterisrics = await this.getCharacteristics(service.uuid);
      console.log(characterisrics);
    }
    
    await this.setNotify({
      serviceId:this.serviceId,
      characteristicId:this.notifyId,
      state:true
    });
  }

  async onBLECharacteristicValueChange(value){
   // console.log(value);
    try{
      var resp = await this.config.onValueChange(
        this,
        value
      );
      if(resp){
        this._dispatchSuccess(resp);
      }
    }catch(e){
      this._dispatchError(e);
    }
  }

  async createConnection(){
    await bluetoothAdapter.createBLEConnection({
      deviceId:this.deviceId
    });
  }

  async closeConnection(){
    await bluetoothAdapter.closeBLEConnection({
      deviceId:this.deviceId
    });
  }

  async getServices(){
    var services =  await bluetoothAdapter.getBLEDeviceServices({deviceId:this.deviceId});
    return services.services;
  }

  async getCharacteristics(serviceId){
    var characteristics= await bluetoothAdapter.getBLEDeviceCharacteristics({
      deviceId:this.deviceId,
      serviceId:serviceId
    });
    return characteristics.characteristics;
  }

  async setNotify({
    serviceId,
    characteristicId,
    state=true
  }){
    return bluetoothAdapter.notifyBLECharacteristicValueChange({
      deviceId:this.deviceId,
      serviceId,
      characteristicId,
      state
    });
  }


  /**
   * 这个在rn中不会真的停止timeout，照样执行不误，是一个大坑
   */
  _clearTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

   /**
   * 写入数据,注意这里需要保证一个完整数据包的传递和接收
   * 注意低功耗蓝牙每一次的数据包大小不要超过20字节，可以自行拆分数组发送，这里拆分算法由各个设备提供。
   */
  write(value) {
    this._clearTimeout();
    if(!this.debug){
      this.timeoutHandle = setTimeout(() => {
        //这里报错
        if(this.resolve){
          this.timeoutHandle = null;
          this._dispatchError(new DeviceError(DeviceError.IO_ERROR));
        }
      }, this.timeout);
    }
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      //这里先写入
      this._write(value)
        .catch((e)=>{
          reject(e);
        })
        .then(() => {
          //如果成功，先不做理会，等待数据回来
        });
    });
  }


  _dispatchSuccess(pack) {
    this._clearTimeout();
    if (this.resolve) {
      const resolve = this.resolve;
      this.resolve = undefined;
      this.reject = undefined;
      resolve(pack);
    } else {
      //如果是其他通知呢,不是经过问答式??
      if(this.config.onGetExtraPack){
        this.config.onGetExtraPack(
          this,
          pack);
      }else{
        console.log('在promise调用过后再次调用??');
      }
    
    }
  }

  _dispatchError(e) {
    this._clearTimeout();
    if (this.reject) {
      const reject = this.reject;
      this.resolve = undefined;
      this.reject = undefined;
      reject(e);
    } else {
      console.log('在promise调用过后再次调用??');
    }
  }

  _writeOnce(value) {
    if (!value) {
      throw new Error('请输入写入值');
    }
    if (typeof value == 'string') {
      console.log('写入值', value);
      value = str2hex(value);
    } else {
      console.log('写入值', hex2str(value));
    }
    return bluetoothAdapter.writeBLECharacteristicValue({
      deviceId: this.deviceId,
      serviceId: this.serviceId,
      characteristicId: this.writeId,
      value: value,
    });
  }
  /**
   * 这里仅仅确认写入成功而已,所以不需要返回值
   */
  async _write(value){
    if (Array.isArray(value)) {
      for (var i in value) {
        await this._writeOnce(value[i]);
      }
    } else {
      await this._writeOnce(value);
    }
  }

}

class ClassicBluetoothDevice extends BluetoothDevice{
  constructor(device){
    super(device);
  }
}



class BluetoothService{

  constructor(configs,debug = false){
    this.configs = configs;
    this.devices = {};
    this.debug = debug;
  }

  createBleDevice(rawDevice){
      return new BleDevice(rawDevice);
  }

  async startScan(){
    await bluetoothAdapter.openBluetoothAdapter();
    if(this.debug){
      console.log("openBluetoothAdapter ok");
    }
    await bluetoothAdapter.startBluetoothDevicesDiscovery();
    if(this.debug){
      console.log("startBluetoothDevicesDiscovery ok");
    }
    await bluetoothAdapter.onBluetoothDeviceFound(this.onRawDeviceFound.bind(this));
    if(this.debug){
      console.log("onBluetoothDeviceFound ok");
    }
    bluetoothAdapter.onBLECharacteristicValueChange(this.onBLECharacteristicValueChange.bind(this));
  }

  async stopScan(){
    await bluetoothAdapter.stopBluetoothDevicesDiscovery();
  }


  onBLECharacteristicValueChange({
    deviceId,
    value
  }){
    var device = this.getDeviceById(deviceId);
    device.onBLECharacteristicValueChange(value);
  }

  getDeviceById(deviceId){
    return this.devices[deviceId];
  }

  async startupDevice(deviceId){
     // 这里需要设置一下回调
     var device =this.getDeviceById(deviceId);
     if(device==null){
      throw new Error("未找到"+deviceId+"对应的设备");
     }
     await device.startup();
     if(!device.config.onStartup){
       throw new Error("请在设备配置对象中设置onStartup回调方法");
     }
     return await device.config.onStartup(this,device);
 
  }

  async close(){
    for(var i in this.devices){
      var device = this.devices[i];
      try{
        //进行关闭连接等操作
        await device.close();
      }catch(e){
        console.warn("关闭设备发生异常",e);
      }finally{
        device.config.onShutdown&&device.config.onShutdown(this,device);
      }
    }
    try{
      await bluetoothAdapter.stopBluetoothDevicesDiscovery();
      await bluetoothAdapter.closeBluetoothAdapter();
    }catch(e){
      console.warn("关闭蓝牙发生异常",e);
    }finally{
      this.devices = {};
    }
  }

  onDeviceFound(callback){
    this._onDeviceFound = callback;
  }

  onRawDeviceFound(devices){
    for(var i in devices.devices){
      var rawDevice = devices.devices[i];
      if(this.debug){
        console.log(rawDevice);
      }
      for(var j in this.configs){
        var config = this.configs[j];
        if(config.filter(rawDevice)){
            var device = config.onCreateDevice(this,rawDevice);
            device.setConfig(config);
            this.devices[rawDevice.deviceId] = device;
            this._onDeviceFound && this._onDeviceFound(device);
        }
      }
    }
    
  }

}

BluetoothService.setAdapter=(adapter)=>{
  bluetoothAdapter = adapter;
};


export default BluetoothService;