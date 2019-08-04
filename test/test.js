import BluetoothService from '../src/bluetooth_service';

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
    var service = new BluetoothService([
      {
        filter(device){
          return device.name.startsWith("ABC");
        },
        onCreateDevice(service,device){
          return service.createBleDevice(device);
        }
      }
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
