function concatArray(array1,array2) {
    var newArray = new UInt8Array(array1.length+array2.length);
    array1.forEach((element,index,array) => {
        newArray[index] = element;
    });
    array2.forEach((element,index,array) => {
        newArray[index+array1.length] = element;
    });
    return newArray;

}

function get_robot_address(team_number) {
    var id = team_number.toString()
    return `10.${id.substring(0,2)}.${id.substring(2)}`;
}

var robot_data = {};

/**
 * Context Requirements
 * 
 * team number
 * fn get_joystick_data
 * 
 * fn started
 * fn stopped
 */
module.exports = class Protocol2019 {
    constructor(context, address=null) {
        /**
         * Control Codes
         */

        this.codes = {
            "TEST":0x01,
            "AUTO":0x02,
            "TELE":0x00,//Teleoperated
            "ESTP":0x80,//E-Stop
            "RNRM":0x30,//Normal
            "RBUT":0x08,//Reboot
            "RSTT":0x10,//Restart code
            "RUNC":0x00,//Not connected
            "RHCD":0x20,//Robot Has code
            "RQTM":0x01,//request time
            "RED1":0x00,
            "RED2":0x01,
            "RED3":0x02,
            "BLU1":0x03,
            "BLU2":0x04,
            "BLU3":0x05,
            'STCK':0x0c, //Joystick tag
            'DATE':0x0f, // Date Tag
            'TMZN':0x10, //Timezone
        };
        /**Ports */
        this.port_robo_recv = 1150;
        this.port_robo_send = 1110;

        /**Timer times in ms */
        this.robot_precision = 50;
        this.robot_address = ((address === null) ? get_robot_address(context.team_number):address);
        this.context = context;

    }

    reset() {
        this.sent_robot_packets = 0;
    }
    
    get_control_code() {
        return this.codes[this.control_code];
    }

    get_request_code() {
        return this.codes[this.request_code];
    }

    get_station_code() {
        return this.codes[this.station_code];
    }

    decode_status(control, status) {
        if((control & this.codes['ESTP']) > 0) {
            return "ESTP"
        }
        else if((status & this.codes['RHCD']) > 0) {
            return "RHCD"
        }
    }

    get_time_data() {
        let axis_data = stick.axis.length + 1;
        let hat_data = (stick.hats.length * 2) + 1;

        //I am not sure why these values are the way they are. Needs investigation.
        //2 is header size while three is button data. WEIRD.
        return 2 + 3 + axis_data + hat_data;
    }

    get_joystick_data() {
        var data = context.get_joystick_data(robot_data);
        //Data is an object with an array of joystick objects
        /**{sticks:[
         *  {
         *      axis:[0-255],
         *      buttons:[1,0],
         *      hats:[???]
         *  },
         * "request_code":'👹',
         * "control_code":'TELE' 
         * ]}*/

        this.station_code = data.station_code;
        this.request_code = data.request_code;
        this.control_code = data.control_code;

        var packet_data = new Uint8Array(0);
        data.sticks.forEach((object,index,arr) => {
            packet_data = concatArray(packet_data,get_joystick_size(object));
            packet_data = concatArray(packet_data, this.codes['STCK']);

            packet_data = concatArray(packet_data, object.axis.length);
            object.axis.forEach((value)=> {
                packet_data = concatArray(packet_data,value);
            });

            var flags = 0;
            object.buttons.forEach((button,index)=> {
                flags += (button === 1 ? Math.pow(2, index) : 0);
            });

            packet_data = concatArray(packet_data, flags>>8);
            packet_data = concatArray(packet_data,flags);

            packet_data = concatArray(packet_data, this.hats.length);
            this.hats.forEach((hat)=>{
                packet_data = concatArray(packet_data, hat>>8);
                packet_data = concatArray(packet_data, hat);
            });

        });

        return packet_data;
    }

    get_robot_packet() {

        let array = new UInt8Array(2);
        array[0] = this.sent_robot_packets>>8;
        array[1] = this.sent_robot_packets;

        let control_data = this.get_joystick_data()

        concatArray(array, this.get_control_code());
        concatArray(array, this.get_request_code());
        concatArray(array, this.get_station_code());

        if(sendData) {
            concatArray(array, this.get_time_data());
        }

        if(sent_robot_packets > 5) {
            concatArray(array, control_data);
        }

        this.sent_robot_packets += 1;

        return array.buffer;
    }

    read_extended(msg, rinfo) {
        if(msg.length < 9){
            return;
        }

        //tag = msg[9];
        //TODO see if cpu data sent

    }

    read_robot_packet(msg, rinfo) {

        msg = Uint8Array(msg);

        if(msg.length < 7) {
            //Drops packet. May be an issue. See testing
            return 0;
        }

        rinfo.robot_status = decode_status(msg[3],msg[4])
        rinfo.request = msg[7];

        rinfo.voltage = msg[5]+(msg[6]/0xff);

        robot_data = rinfo;

        if(msg.length > 9) {
            read_extended(msg, rinfo);
        }

    }

    robot_server_started() {
        this.reset();
        this.context.on_started();
    }

    robot_server_stopped() {
        this.context.on_stopped();
    }

}
