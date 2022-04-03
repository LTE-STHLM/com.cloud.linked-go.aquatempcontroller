'use strict';

const { Driver } = require('homey');
const API = require("./api");

class MyDriver extends Driver {


  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Heat Pump has been initialized');
    this.DeviceAPI = new API;
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  /*
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
       {
         name: 'Heat Pump',
         data: {
           id: 'my-device-001',
         },
       },
    ];
  }
*/
  async onPair(session) {
    let username = "";
    let password = "";

    session.setHandler("login", async (data) => {
      username = data.username;
      password = data.password;

      const credentialsAreValid = await this.DeviceAPI.testCredentials({
        username,
        password,
      });

      // return true to continue adding the device if the login succeeded
      // return false to indicate to the user the login attempt failed
      // thrown errors will also be shown to the user
      return credentialsAreValid;
    });

    session.setHandler("list_devices", async () => {
      const api = await this.DeviceAPI.login({ username, password });
      const myDevices = await api.getDevices();

      const devices = myDevices.map((myDevice) => {
        return {
          name: myDevice.name,
          data: {
            id: myDevice.id,
          },
          settings: {
            // Store username & password in settings
            // so the user can change them later
            username,
            password,
          },
        };
      });

      this.log(devices)
      return devices;
    });
  }

}

module.exports = MyDriver;