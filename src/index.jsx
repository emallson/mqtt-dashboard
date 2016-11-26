'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
var {XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalGridLines, LineSeries, DiscreteColorLegend} = require('react-vis');
var Immutable = require('immutable');
var moment = require('moment');
var ch = require('color-hash');

function topic_match(pattern, topic) {
  let re = new RegExp(pattern.replace(/\+/g, '([^/]+)').replace(/#/g, '(.+)'));

  return topic.match(re);
}

function parse_temperature_msg(message) {
  return Immutable.fromJS({timestamp: Date.now(),
                            value: Number.parseInt(message.toString())});
}

class TemperaturePlot extends React.PureComponent {
  render() {
     return (
        <XYPlot width={800} height={300} xType="time" yDomain={[0,100]}>
          <HorizontalGridLines/>
          <VerticalGridLines/>
          <XAxis title="Time"/>
          <YAxis title="Temperature"/>
          {this.props.data.map((vals, topic) => <LineSeries key={topic} data={vals.toJS().map(({timestamp, value}) => {return {x: timestamp, y: value};})}/>).toArray()}
         <DiscreteColorLegend items={this.props.data.keySeq().toJS()} />
        </XYPlot>
      );
  }
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

class TemperaturePlots extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = load(this.props.preserve) || {data:  { shown: {}, hidden: {} }};
    this.state.data = Immutable.fromJS(this.state.data);

    this.props.client.subscribe(this.props.topic); // false generality
    this.props.client.on('message', (topic, message) => {
      let [whole, building, room] = topic_match('+/+/temperature', topic);

      this.setState((prev, props) => {return {data: truncate_timeseries(prev. data. mergeWith (concatMerger, {
        [prev.data.get('hidden').has(building)? 'hidden' : 'shown']: {
          [building]: {[room]: [parse_temperature_msg (message)]}
        }
      }))}});
    });
  }

  render() {
    var plots = this.state.data.get('shown').map((state, building) => <TemperaturePlot key={building} data={state} />);
    return (<div>{plots.toArray()}</div>);
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevProps.hasOwnProperty('preserve')) {
      store(prevProps.preserve, this.state);
    }
  }
}

var hasher = new ch({saturation: 0.25, lightness: 0.6});
class DeviceBlock extends React.PureComponent {
  render() {
    var subs = null;
    if(this.props.device.subscribes.length > 0) {
      subs = <div className="subscriptions">
        {this.props.device.subscribes.map((topic) => <code key={topic}>{topic}</code>)}
      </div>;
    }
    var pubs = null;
    if(this.props.device.publishes.length > 0) {
      pubs = <div className="publishes">
        {this.props.device.publishes.map((topic) => <code key={topic}>{topic}</code>)}
      </div>;
    }
    return (
      <div className="device-block" style={{borderColor: hasher.hex(this.props.device.type)}}>
        <div className="title" style={{backgroundColor: hasher.hex(this.props.device.type)}}>
          <h3>{this.props.device.type}</h3>
        </div>
        <div className="body">
          {this.props.device.description}
        </div>
        {pubs}
        {subs}
      </div>
    );
  }
}

class DeviceDescriptionRegion extends React.PureComponent {
  render() {
    return (
      <div className="device-block-region">{Object.keys(this.props.devices).map((key) => <DeviceBlock key={key} device={this.props.devices[key]}/>)}</div>
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
    <div>
      <div><DeviceDescriptionRegion devices={devices} /></div>
      <div><TemperaturePlots topic="+/+/temperature" client={client} preserve="temp-data" /></div>
    </div>,
    document.getElementById("root")
  )
});

client.subscribe('home/bedroom/temperature', () => console.log(arguments));
