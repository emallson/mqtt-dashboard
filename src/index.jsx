'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
var Immutable = require('immutable');
var moment = require('moment');
var {TemperaturePlots} = require('./temperature-plots.jsx');
var {DeviceDescriptionRegion} = require('./devices.jsx');

function topic_match(pattern, topic) {
  let re = new RegExp(pattern.replace(/\+/g, '([^/]+)').replace(/#/g, '(.+)'));

  return topic.match(re);
}

function parse_temperature_msg(message) {
  return Immutable.fromJS({timestamp: Date.now(),
                            value: Number.parseInt(message.toString())});
}


function concatMerger(a, b) {
  if(Immutable.List.isList(a) && Immutable.List.isList(b)) {
    return a.concat(b);
  }
  if(a && a.mergeWith) {
    return a.mergeWith(concatMerger, b);
  }
  return b;
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch(e) {
    console.log("Failed to preserve data in " + key + ": " + e);
  }
}

function load(key) {
  if(!key) { return null; }
  let val = localStorage.getItem(key);
  if(val == null) {
    return null;
  } else {
    return JSON.parse(val);
  }
}

function truncate_timeseries(data) {
  let limit = moment().subtract(1, 'd');
  return data.map((segment) => segment.map((bld) => bld.map((room) => room.filter((obj) => moment(obj.get('timestamp')).isSameOrAfter(limit)))))
}



class IoTDashboard extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = load(this.props.preserve) || {
      data:  { shown: {}, hidden: {} },
      devices: {},
      alive: {}
    };
    this.state.data = Immutable.fromJS(this.state.data);
    this.state.devices = Immutable.fromJS(this.state.devices);
    this.state.alive = Immutable.fromJS(this.state.alive);

    this.props.client.subscribe('+/+/temperature');
    this.props.client.subscribe('iot/device/added');
    this.props.client.subscribe('iot/device/died');
    this.props.client.on('message', (topic, message) => {
      if(topic_match('+/+/temperature', topic)) {
        // Temperature received, append it
        let [whole, building, room] = topic_match('+/+/temperature', topic);

        this.setState((prev, props) => {return {data: truncate_timeseries(prev.data.mergeWith(concatMerger, {
          [prev.data.get('hidden').has(building)? 'hidden' : 'shown']: {
            [building]: {[room]: [parse_temperature_msg (message)]}
          }
        }))}});
      } else if (topic_match('iot/device/added', topic)) {
        // device added
        this.props.client.subscribe('iot/device/status/' + message.toString());
      } else if (topic_match('iot/device/status/+', topic)) {
        // received device ddl
        let [whole, uuid] = topic_match('iot/device/status/+', topic);
        this.setState((prev, props) => {
          return {devices: prev.devices.set(uuid, Immutable.fromJS(JSON.parse(message.toString()))),
                  alive: prev.alive.set(uuid, true)}
        });
      } else if (topic_match('iot/device/died', topic)) {
        // device died
        this.setState((prev, props) => {
          return {alive: prev.alive.set(message.toString(), false)}
        });
      }
    });
  }

  render() {
    return (
      <div>
        <DeviceDescriptionRegion devices={this.state.devices} alive={this.state.alive} />
        <TemperaturePlots data={this.state.data} />
      </div>
    );
  }
}

var devices = {
  "abcd": {
    "type": "button",
    "publishes": [
      "#/force-update"
    ],
    "subscribes": [],
    "description": "A simple publish-only button that forces any subscribed sensors to send updated data."
  },
  "efgh": {
    "type": "temperature",
    "publishes": [
      "home/kitchen/temperature"
    ],
    "subscribes": [
      "home/kitchen/temperature/force-update"
    ],
    "description": "A simple temperature sensor. Publishes temperature readings periodically, or when a subscribed message is received."
  }
 }

var client = mqtt.connect("ws://localhost:1884");
client.on('connect', () => {
  ReactDOM.render(
    <IoTDashboard client={client} />,
    document.getElementById("root")
  )
});
