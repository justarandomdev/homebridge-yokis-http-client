import axios from 'axios';
import { Logger } from 'homebridge';

const BASE_ENDPOINT = 'https://www.yokiscloud.fr/api/1_28/individuals/';

class YokisModule {
  name: string;
  uid: string;
  isOn?: boolean;

  constructor(name: string, uid: string) {
    this.name = name;
    this.uid = uid;
  }
}

export class YokisClient {
  logger: Logger;
  username: string;
  password: string;
  userId?: string;
  boxId?: string;
  token?: string;
  modules: { [key: string]: YokisModule } = {};

  constructor(logger: Logger, username: string, password: string) {
    this.logger = logger;
    this.username = username;
    this.password = password;
  }

  async postHttpRequest(url: string, payload: string): Promise<any> {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`HTTP request failed with status code: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error making HTTP request:', error);
      throw error;
    }
  }

  async authentifiedGetHttpRequest(url: string, token: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
      });

      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`HTTP request failed with status code: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error making HTTP request:', error);
      throw error;
    }
  }

  async authentifiedPostHttpRequest(url: string, token: string, payload): Promise<any> {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
      });

      if (response.status === 200) {
        return response;
      } else {
        throw new Error(`HTTP request failed with status code: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error making HTTP request:', error);
      throw error;
    }
  }

  async loginUser() {
    const payload = JSON.stringify({'login': this.username, 'password': this.password});
    await this.postHttpRequest(BASE_ENDPOINT+'login', payload)
      .then((response) => {
        this.userId = response.data.id;
        this.boxId = response.data.boxes[0].boxId;
        this.token = response.data.token;
      })
      .catch((error) => {
        this.logger.error('Error making HTTP request:', error);
      });
  }

  async fetchInstallation() {
    const url = BASE_ENDPOINT+this.userId+'/box/'+this.boxId;
    await this.authentifiedGetHttpRequest(url, this.token!)
      .then((response) => {
        for (const module of response.data.modules) {
          if (module.function === 4) {
            this.modules[module.uid] = new YokisModule(module.name, module.uid);
          }
        }
      })
      .catch((error) => {
        this.logger.error('Error making HTTP request:', error);
      });
  }

  async fetchStatus() {
    const url = BASE_ENDPOINT+this.userId+'/box/'+this.boxId+'/modulestable';
    await this.authentifiedGetHttpRequest(url, this.token!)
      .then((response) => {
        for (const module of response.data.data.table) {
          const isOn = module.var === 0 ? false : true;
          this.logger.debug(`Result of fetch status: module ${this.modules[module.uid].name} is on: ${isOn}, var value: ${module.var}`);
          this.modules[module.uid].isOn = isOn;
        }
      })
      .catch((error) => {
        this.logger.error('Error making HTTP request:', error);
      });
  }

  async toggleModule(moduleUid: string, on: boolean) {
    const url = BASE_ENDPOINT+this.userId+'/box/'+this.boxId+'/commands';
    const payload = JSON.stringify({'cmd': `command.xml?action=order&id=${moduleUid}&order=${on ? 'on' : 'off'}`});
    await this.authentifiedPostHttpRequest(url, this.token!, payload)
      .then((response) => {
        this.logger.debug('Toggle Result:', response.data);
      })
      .catch((error) => {
        this.logger.error('Error making HTTP request:', error);
      });
  }
}