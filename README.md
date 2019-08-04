
# zoom-bluetooth-service

 本库用于抽象蓝牙设备的生命周期：
 * 1、连接与连接管理
 * 2、数据包的发送与解析
 * 其中与蓝牙设备的具体用途无关

# 安装

```
yarn add zoom-bluetooth-service
```


# 使用



## 定义你的设备配置


```
class YourDeviceConfig{


  constructor(){
    this.serviceId="主服务serviceId";
    this.writeId="写入特征ID"
    this.notifyId="通知特征ID"
  }
  
  filter(device){
    return device.name.startsWith("ABC");
  }

  onCreateDevice(service,device){
    return service.createBleDeivce(device);
  }

  onValueChange(device,value){ 
    //value不是一个完整的数据
    device.appendValue(value);
    //如果finalValue是一个完整的包
    let finalValue = device.getValue();
    if(isComplete(finalValue)){
      return finalValue;
    }
  }

  //启动回到，这里处理设备启动之后应该执行的操作
  onStartup(service,device){

    
  }

  //关闭回调,这里启动设备关闭之后应该执行的操作
  onShutdown(service,device){
  
  }


}
```


## 定义服务

```
var service = new ZoomBleService([new YourDeviceConfig()]);

service.onDeviceFound(async (device)=>{
   await service.stopScan();
   //这个startRet是YourDeviceConfig.onStartup的返回值
   var startRet = service.startupDevice(device.deviceId);
   //....后续
});
service.startScan();

```

## 其他方法









