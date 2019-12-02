import BluetoothService from '../src/bluetooth_service';
import { DeviceConfig } from '../src/bluetooth_service';

describe('test bluetooth serice', () => {

  it('test bluetooth serice', async (done) => {
    BluetoothService.setAdapter({
      openBluetoothAdapter(){
        return true;
      },
      startBluetoothDevicesDiscovery(){
        return true;
      },
      onBluetoothDeviceFound(callback){

      },
      onBLECharacteristicValueChange(callback){
        
      }



    });

    class MyDeviceConfig extends DeviceConfig{
      filter(device){
        return device.name.startsWith("ABC");
      }

      onCreateDevice(service,device){
        return service.createBleDevice(device);
      }
    }

    var config = new MyDeviceConfig();
    expect(config.writeTimeout).toBe(200);
    expect(config.connectTimeout).toBe(5000);
    
    
    

    var service = new BluetoothService([
      config
    ]);

    service.onDeviceFound((device)=>{
      service.stopScan();
    });

    try{
      await service.startScan();
      done();
    }catch(e){
      throw e;
    }
    
  });
  
});
