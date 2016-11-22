'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
var {XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalGridLines, LineSeries, DiscreteColorLegend} = require('react-vis');
var Immutable = require('immutable');
var moment = require('moment');

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

function immutable_load(key) {
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
    this.state = load(this.props.preserve) || {data:  Immutable.fromJS({ shown: {}, hidden: {} })};

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

var client = mqtt.connect("ws://localhost:1884");
client.on('connect', () => {
  ReactDOM.render(
    <TemperaturePlots topic="+/+/temperature" client={client} preserve="temp-data" />,
    document.getElementById("root")
  )
});

client.subscribe('home/bedroom/temperature', () => console.log(arguments));
