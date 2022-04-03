const axios = require('axios');

module.exports = class API {
    constructor() {
  
  /*     axios.interceptors.response.use(response => {
        console.log('Intercept response.')
        return response;
     }, error => {
       throw error; //Try again? Can also throw error.
     }); */
  
      this.credentials = {};
      this.token = "";
  
      this.URL_LOGIN="https://cloud.linked-go.com/cloudservice/api/app/user/login.json";
      this.URL_DEVICELIST="https://cloud.linked-go.com/cloudservice/api/app/device/deviceList.json";
      this.URL_GETDATABYCODE="https://cloud.linked-go.com/cloudservice/api/app/device/getDataByCode.json";
      this.URL_GETDEVICESTATUS="https://cloud.linked-go.com/cloudservice/api/app/device/getDeviceStatus.json";
      this.URL_CONTROL="https://cloud.linked-go.com/cloudservice/api/app/device/control.json";
      this.URL_GETFAULT="https://cloud.linked-go.com/cloudservice/api/app/device/getFaultDataByDeviceCode.json";
    
      this.headers = {"Content-Type": "application/json; charset=utf-8"};
    }
  
    async getDeviceData(id){
      let data = {"device_code":id,"protocal_codes":["Power","Mode","Manual-mute","T01","T02","2074","2075","2076","2077","H03","Set_Temp","R08","R09","R10","R11","R01","R02","R03","T03","1158","1159","F17","H02","T04","T05"]}
      
      let success = false;
      let r = {};
  
      await axios
        .post(this.URL_GETDATABYCODE, data , { headers: this.headers })
        .then(res => {
          //console.log('statusCode:' + res.status);
          //console.log(res);
          if( res.data.is_reuslt_suc){
            success = true;
            r = res.data['object_result'];
           
          } else {
            console.log("Something went wrong.");
            success = false;
          }
        })
        .catch(error => {
          console.error(error);
          if(error.response.status == 401){
            console.log("401...");
            try {
              this.login(this.credentials);
            } catch ( error ) {
              console.log( error + " Not valid login?");
              success = false;
            };
          } else {
            success = false;
          }
        })
  
        if(success){
          return r;
        } else {
          throw "failed to update.";
        }
  
    }
  
    async login(credentials){
      this.credentials = credentials;
      console.log( this.credentials + " " + this.credentials.username + " " + this.credentials.password );
  
      let success = false;
  
      await axios
        .post(this.URL_LOGIN, {
          "user_name":this.credentials.username, 
          "password":this.credentials.password,
          "type":"2"
        }, { headers: this.headers })
        .then(res => {
          //console.log('statusCode:' + res.status);
          //console.log(res);
          if( res.data.is_reuslt_suc){
            this.token = res.data.object_result['x-token'];
            this.headers['x-token'] = this.token;
            //console.log(this.token);
            success = true;
          } else {
            console.log("Invalid credentials");
            success = false;
          }
        })
        .catch(error => {
          console.error(error);
          success = false;
        })
  
        if(success){
          return this;
        } else {
          return false;
        }
    }
  
    async getDevices(){
  
      let success = false;
      let devices = [];
  
      await axios
        .post(this.URL_DEVICELIST, {}, { headers: this.headers })
        .then(res => {
          //console.log('statusCode:' + res.status);
          //console.log(res);
          if( res.data.is_reuslt_suc){
            success = true;
            for(let i = 0; i<res.data['object_result'].length; i++){
              //console.log(res.data['object_result'][i])
              let device = res.data['object_result'][i]; 
              devices.push({
                'name': device.device_nick_name,
                'id': device.device_code
              });
            }
          } else {
            console.log("Something went wrong.");
            success = false;
          }
        })
        .catch(error => {
          console.error(error);
          success = false;
        })
  
        if(success){
          return devices;
        } else {
          return false;
        }
    
      /*return [
          // Example device data, note that `store` is optional
            {
            name: 'Heat Pump',
            id: 'my-device-001',
            },
        ];*/
    }
  
    async testCredentials(credentials){
      return this.login(credentials);
    }
  
    async updateData(device){
      let data;
      try {
        data = await device.driver.DeviceAPI.getDeviceData(device.id);
  
      } catch (err){
        console.log(err);
        return;
      }
      let parsedData = {};
      data.forEach( item => {
          parsedData[item.code] = item.value;
      });
      //console.log(parsedData);
  
      device.setSettings(parsedData);
  
      device.setCapabilityValue('onoff', Boolean(parsedData['Power'] == "1"));
      device.setCapabilityValue('target_temperature',Number(parsedData['R02'])).catch((err) =>{
        console.log(Number(parsedData['R02']), "error: ");
        console.log(err);
      });
      device.setCapabilityValue('measure_temperature',Number(parsedData['T02'])).catch((err) =>{
        console.log(Number(parsedData['T02']), "error: ");
        console.log(err);
      });
      return;
    }
  
    async setPower(device, value){
      let power = 0;
  
      if( value == true ){
        power = 1;
      } else {
        power = 0;
      }
      /*
      let mode = "";
      console.log(settings["Mode"]);
      if ( settings["Mode"] == "cool" ){
        mode = "R01"}
      else if ( settings["Mode"] == "auto"){
        mode = "R03"}
      else {
        mode = "R02"
      }*/
  
      let data = {"param":[{"device_code":device.id,"protocol_code":"power","value":power}]};
  
      //console.log(device.getSettings());
      //console.log("Posting... headers: ", this.headers, " Data: ", data);
  
      await axios.post(this.URL_CONTROL, data , { headers: this.headers })
      .then(res => {
        if( res.data['error_msg'] == "Success"){
          //console.log('Success: ', res);
          console.log('Success updating power: ', power)
          device.setSettings('Power', power);
          device.setCapabilityValue('onoff', value);
          
        } else {
          console.log("Something went wrong: ", res.data['error_msg']);
        }
      })
      .catch(error => {
        console.error(error);
      })
        
      
    }
    
    async setTemperature(device, value){
      let settings = device.getSettings();
      let temperature = value;
      let mode = "";
      console.log(settings["Mode"]);
      if ( settings["Mode"] == "cool" ){
        mode = "R01"}
      else if ( settings["Mode"] == "auto"){
        mode = "R03"}
      else {
        mode = "R02"
      }
  
      let data = {"param":[{"device_code":device.id,"protocol_code":mode,"value":temperature},{"device_code":device.id,"protocol_code":"Set_Temp","value":temperature}]};
  
      //console.log(device.getSettings());
      //console.log("Posting... headers: ", this.headers, " Data: ", data);
  
      await axios.post(this.URL_CONTROL, data , { headers: this.headers })
      .then(res => {
        if( res.data['error_msg'] == "Success"){
          //console.log('Success: ', res);
          console.log('Success updating temperature: ', temperature);
          device.setSettings(mode, temperature);
          device.setCapabilityValue('target_temperature', temperature);
          
        } else {
          console.log("Something went wrong: ", res.data['error_msg']);
        }
      })
      .catch(error => {
        console.error(error);
      })
        
      
    }
    
  }