import * as io from 'socket.io-client';

import {nodeVersionCompatibility, nodeVersion, nodePort} from '../../../../consts/const_global.js';
import {sendRequest} from '../../../../common/sockets/sockets.js';
import {SocketAddress} from '../../../../common/sockets/socket-address.js';
import {NodeLists} from '../../../lists/node-lists.js';
import {NodeProtocol} from '../../../../common/sockets/node/node-protocol.js';
import {NodePropagationProtocol} from '../../../../common/sockets/node/node-propagation-protocol.js';

class NodeClient {

    // socket : null,

    constructor(){

        //console.log("NodeClient constructor");

        this.socket = null;
    }

    connectTo(address, port){

        let sckAddress = SocketAddress.createSocketAddress(address, port);


        address = sckAddress.getAddress();
        port = sckAddress.port;

        let that = this;

        return new Promise(function(resolve) {

            try
            {
                if (address.length < 3){
                    console.log("rejecting address",address);
                    resolve(false);
                    return false;
                }

                // in case the port is not included
                if (address.indexOf(":") === -1)  address += ":"+port;
                if (address.indexOf("http://") === -1 )  address = "http://"+address;

                console.log("connecting... to address", address);

                let socket = null;
                try {
                    socket = io.connect(address, {});
                }  catch (Exception){
                    console.log("Error Connecting Node to ", address," ", Exception.toString());
                    resolve(false);
                }
                that.socket = socket;


                //console.log(socket);

                socket.once("connect", response=>{

                    socket.sckAddress = SocketAddress.createSocketAddress(socket.io.opts.hostname||sckAddress.getAddress(),  socket.io.opts.port||sckAddress.port);

                    console.log("Client connected to ", socket.sckAddress.getAddress());

                    NodeProtocol.sendHello(socket).then( (answer)=>{
                        that.initializeSocket(socket);
                    });

                    resolve(true);
                });

                socket.once("connect_error", response =>{
                    console.log("Client error connecting", address);
                    //NodeLists.disconnectSocket(that.socket);

                    resolve(false);
                });

                socket.once("connect_failed", response =>{
                    console.log("Client error connecting (connect_failed) ", address);
                    NodeLists.disconnectSocket(socket);

                    resolve(false);
                });

                socket.connect();

            }
            catch(Exception){
                console.log("Error Raised when connecting Node to ", address," ", Exception.toString());
                resolve(false);
            }

            resolve(true);

        });

    }

    initializeSocket(socket){

        let isUnique = NodeLists.addUniqueSocket(socket, true, false);

        socket.once("disconnect", response => {

            console.log("Client disconnected ",  socket.sckAddress.toString() );
            NodeLists.disconnectSocket(socket);

        });

        NodePropagationProtocol.initializeSocketForPropagation(socket);
    }


}

exports.NodeClient =  NodeClient;