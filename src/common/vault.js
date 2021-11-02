// API is available here https://www.npmjs.com/package/idb#api

import { openDB } from 'idb/with-async-ittr.js';

export class Vault {
  masterDb; //private
  db; //private
  async init () {
    this.masterDb = await openDB('master', 1, {
      upgrade(db) {
        const storeMasterKey = db.createObjectStore('keys', {
          // The 'id' property of the object will be the key.
          keyPath: 'id',
        });
      }
    });

    this.db = await openDB('vault', 3, {
      async upgrade(db, oldVersion, newVersion, transaction) {
        if (await checkMigration(db, oldVersion, newVersion, transaction)) {
          return;
        }
        // Create a store of objects
        const storeAccounts = db.createObjectStore('accounts', {
          // The 'id' property of the object will be the key.
          keyPath: 'address',
        });
        /*
        { address: "0:123",
          nickname: "main",
          balance: {"main.ton.dev": 5000000000},
          transactions: {"main.ton.dev": [{...}]},
          updatedDate: 123123,
          createdDate: 123123,
          contactList: {"main.ton.dev": ["0:11", "0:12"]},
          contractList: {"main.ton.dev": ["0:21", "0:22"]},
          tokenList: {"main.ton.dev": ["0:31", "0:32"]},
          deployed: [], // server list on which was deployed
          encrypted: { //this object is encrypted
            privKey: "e3412345fcd",
            pubKey: "e3412345fcd",
          }
        }
        */
        // Create an index on the 'updatedDate' property of the objects.
        storeAccounts.createIndex('updatedDate', 'updatedDate');
        // Create an index on the 'createdDate' property of the objects.
        storeAccounts.createIndex('createdDate', 'createdDate');

        // Create a store of objects
        const storeNetworks = db.createObjectStore('networks', {
          // The 'id' property of the object will be the key.
          keyPath: 'server',
          autoIncrement: true,
        });
        /*
        { id: 1,
          name: "Main",
          server: "main.ton.dev",
          explorer: "https://ton.live",
          endpoints: ["https://main2.ton.dev",
                      "https://main3.ton.dev",
                      "https://main4.ton.dev"],
          test: false,
          giver: "",
          coinName: "CRYSTAL",
          custom: false
        }
        */
        const networks = [
          { id: 1,
            name: "Main",
            server: "main.ton.dev",
            explorer: "https://ton.live",
            endpoints: ["https://main2.ton.dev",
                        "https://main3.ton.dev",
                        "https://main4.ton.dev"],
            test: false,
            giver: "",
            coinName: "CRYSTAL",
            custom: false
          },
          {
            id: 2,
            name: "Test",
            server: "net.ton.dev",
            explorer: "https://net.ton.live",
            endpoints: ["https://net1.ton.dev",
                        "https://net5.ton.dev"],
            test: true,
            giver: "",
            coinName: "RUBY",
            custom: false
          },
          {
            id: 3,
            name: "Local",
            server: "localhost:7777",
            explorer: "http://localhost:7777/graphql",
            endpoints: ["http://localhost:7777"],
            test: true,
            giver: "0:b5e9240fc2d2f1ff8cbb1d1dee7fb7cae155e5f6320e585fcc685698994a19a5",
            coinName: "MOONROCK",
            custom: false
          }
        ];

        networks.map((network) => {
          storeNetworks.put(network);
        });
      },
    });
  }

  async addMasterKey (id, key, encrypted) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    await store.put({"id": id, "key": key, "encrypted": encrypted});
    return true;
  }

  async getMasterKey (id) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const result = await store.get(id);
    return result;
  }

  async removeMasterKey (id) {
    const transaction = this.masterDb.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const existingKey = await store.get(id);
    if (existingKey) {
      store.delete(id);
      return true;
    }
    return false;
  }

  async addContact (accountAddress, server, contact) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.contactList[server]) {
        existingAccount.contactList[server].push(contact);
      } else {
        existingAccount.contactList[server] = [];
        existingAccount.contactList[server].push(contact);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeContact (accountAddress, server, contact) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.contactList[server]) {
        if (existingAccount.contactList[server][i] == contact) {
          existingAccount.contactList[server] = existingAccount.contactList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  // contRact
  async addContract (accountAddress, server, contract) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.contractList[server]) {
        existingAccount.contractList[server].push(contract);
      } else {
        existingAccount.contractList[server] = [];
        existingAccount.contractList[server].push(contract);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeContract (accountAddress, server, contract) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.contractList[server]) {
        if (existingAccount.contractList[server][i] == contract) {
          existingAccount.contractList[server] = existingAccount.contractList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addToken (accountAddress, server, token) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.tokenList[server]) {
        existingAccount.tokenList[server].push(token);
      } else {
        existingAccount.tokenList[server] = [];
        existingAccount.tokenList[server].push(token);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async removeToken (accountAddress, server, contract) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      for (const i in existingAccount.tokenList[server]) {
        if (existingAccount.tokenList[server][i] == contract) {
          existingAccount.tokenList[server] = existingAccount.tokenList[server].splice(i, 1);
          break;
        }
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addTransaction (accountAddress, server, tx) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.transactions[server]) {
        existingAccount.transactions[server].push(tx);
      } else {
        existingAccount.transactions[server] = [];
        existingAccount.transactions[server].push(tx);
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async getTransactions (accountAddress, server, count, page) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.transactions[server]) {
        const sortedTransactions = existingAccount.transactions[server].sort(function(a, b) {
          return b.now - a.now;
        });
        return sortedTransactions.slice((page - 1) * count, page * count);
      } else {
        return [];
      }
    }
    return [];
  }

  async updateNickname (accountAddress, nickname) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      existingAccount.nickname = nickname;
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async updateBalance (accountAddress, server, amount) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      existingAccount.balance[server] = amount;
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async markAsDeployed (accountAddress, server) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      if (existingAccount.deployed) {
        existingAccount.deployed.push(server);
      } else {
        existingAccount.deployed = [server];
      }
      await store.put(existingAccount);
      return true;
    }
    return false;
  }

  async addNewAccount (account) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(account.address);
    if (!existingAccount) {
      store.put(account);
      return true;
    }
    return false;
  }

  async getAccount (accountAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    return existingAccount;
  }

  async removeAccount (accountAddress) {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    const existingAccount = await store.get(accountAddress);
    if (existingAccount) {
      store.delete(accountAddress);
      return true;
    }
    return false;
  }

  async getAccountCount () {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    return await store.count();
  }

  async getAccounts () {
    const transaction = this.db.transaction('accounts', 'readwrite');
    const store = transaction.objectStore('accounts');
    return await store.getAll();
  }

  async addNewNetwork (network) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    const existingNetwork = await store.get(network.server);
    if (!existingNetwork) {
      store.add(network);
      return true;
    }
    return false;
  }

  async removeNetwork (server) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    const existingNetwork = await store.get(server);
    if (existingNetwork && existingNetwork.custom) {
      await store.delete(server);
      return true;
    }
    return false;
  }

  async getNetworks () {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    return await store.getAll();
  }

  async getNetwork (server) {
    const transaction = this.db.transaction('networks', 'readwrite');
    const store = transaction.objectStore('networks');
    return await store.get(server);
  }
}

async function checkMigration(db, oldVersion, newVersion, transaction) {
  if (oldVersion == 1 && newVersion == 2) {
    const store = transaction.objectStore('networks');
    const allNetworks = await store.getAll();
    for (let i in allNetworks) {
      if (typeof allNetworks[i].endpoints == "undefined") {
        allNetworks[i].server = allNetworks[i].server.replace("https://", "");
        switch(allNetworks[i].id) {
          case 1:
            allNetworks[i].endpoints = ["https://main2.ton.dev",
                                        "https://main3.ton.dev",
                                        "https://main4.ton.dev"];
            break;
          case 2:
            allNetworks[i].endpoints = ["https://net1.ton.dev",
                                        "https://net5.ton.dev"];
            break;
          case 3:
            allNetworks[i].endpoints = ["http://localhost:7777"];
            break;
        }
        await store.delete(allNetworks[i].server);
        await store.put(allNetworks[i]);
      }
    }
    return true;
  }

  // clean network db from old servers without endpoints
  if (oldVersion == 2 && newVersion == 3) {
    const store = transaction.objectStore('networks');
    const allNetworks = await store.getAll();
    const existedServers = [];
    for (let i in allNetworks) {
      await store.delete("https://" + allNetworks[i].server);
    }
    return true;
  }
  return false;
}
