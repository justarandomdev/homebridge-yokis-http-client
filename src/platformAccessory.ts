import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { YokisHTTPPlatform } from './platform';

export class YokisHTTPAccessory {
  private service: Service;

  constructor(
    private readonly platform: YokisHTTPPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Yokis')
      .setCharacteristic(this.platform.Characteristic.Model, 'MTR2000ER')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.uid);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    setInterval(() => {
      this.updateAccessoryState();
    }, 500);
  }

  async updateAccessoryState() {
    try {
      const module = this.platform.client.modules[this.accessory.context.device.uid];
      this.service.updateCharacteristic(this.platform.Characteristic.On, module.isOn ?? false);
    } catch (error) {
      this.platform.log.error('[updateAccessoryState] Error on getModuleStatus response:', error);
    }
  }

  async setOn(value: CharacteristicValue) {
    await this.platform.client.toggleModule(this.accessory.context.device.uid, value as boolean);
    await this.platform.client.fetchStatus();
    this.updateAccessoryState();
    this.platform.log.debug('Set Characteristic On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {
    await this.platform.client.fetchStatus();
    const isOn = this.platform.client.modules[this.accessory.context.device.uid].isOn ?? false;
    this.platform.log.debug('Get Characteristic On ->', isOn);

    return isOn;
  }
}
