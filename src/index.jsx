'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
var {XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalGridLines, LineSeries, DiscreteColorLegend} = require('react-vis');
var Immutable = require('immutable');
var dateformat = require('dateformat');

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

class TemperaturePlots extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {data:  Immutable.fromJS({ shown: {}, hidden: {} })};

    this.props.client.subscribe(this.props.topic); // false generality
    this.props.client.on('message', (topic, message) => {
      let [whole, building, room] = topic_match('+/+/temperature', topic);

      this.setState((prev, props) => {return {data: prev.data.mergeWith(concatMerger, {
        [prev.data.get('hidden').has(building)? 'hidden' : 'shown']: {
          [building]: {[room]: [parse_temperature_msg (message)]}
        }
      })}});
    });
  }

  render() {
    var plots = this.state.data.get('shown').map((state, building) => <TemperaturePlot key={building} data={state} />);
    return (<div>{plots.toArray()}</div>);
  }
}

var client = mqtt.connect("ws://localhost:1884");
client.on('connect', () => {
  ReactDOM.render(
    <TemperaturePlots topic="+/+/temperature" client={client} />,
    document.getElementById("root")
  )
});

client.subscribe('home/bedroom/temperature', () => console.log(arguments));
