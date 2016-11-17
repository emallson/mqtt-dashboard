'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
// var {LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, ResponsiveContainer} = require('recharts');
var {XYPlot, XAxis, YAxis, HorizontalGridLines, VerticalGridLines, LineSeries} = require('react-vis');
var dateformat = require('dateformat');

class Subscription extends React.PureComponent {
  render() {
    return <h1>Subscription {this.props.topic}</h1>;
  }
}

class SubscriptionList extends React.PureComponent {
  render() {
    return (<ul>{this.props.topics.map((topic) => React.createElement(Subscription, {topic}, null))}</ul>);
  }
}

class TemperaturePlot extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
    this.props.client.subscribe(this.props.topic);
    // this.props.client.onMessageArrived((msg) => {
    //   console.log(msg);
    // });
    this.props.client.on('message', (topic, message) => {
      if(topic == this.props.topic) {
        this.setState((prevState, props) => {
          return {data: prevState.data.concat([{timestamp: Date.now(), value: Number.parseInt(message.toString())}]).slice(-10)};
        });
      }
    });
  }

  render() {
    if(this.state.data.length > 0) {
      return (
        // <ResponsiveContainer>
        //   <LineChart data={this.state.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        //     <XAxis dataKey="timestamp"/>
        //     <YAxis domain={['dataMin - 5', 'dataMax + 5']}/>
        //     <CartesianGrid strokeDasharray="3 3" />
        //     <Tooltip separator=': '/>
        //     <Legend/>
        //     <Line unit="F" name="Temperature" type="monotone" dataKey="value" stroke="#333" />
        //   </LineChart>
        // </ResponsiveContainer>
        <XYPlot width={300} height={300} xType="time" yDomain={[0,100]}>
          <HorizontalGridLines/>
          <VerticalGridLines/>
          <XAxis title="Time"/>
          <YAxis title="Temperature"/>
          <LineSeries data={this.state.data.map(({timestamp, value}) => {return {x: timestamp, y: value};})}/>
        </XYPlot>
      );
    }
    return null;
  }
}

var client = mqtt.connect("ws://localhost:1884");
client.on('connect', () => {
  ReactDOM.render(
    <TemperaturePlot topic="home/bedroom/temperature" client={client} />,
    document.getElementById("root")
  )
});

client.subscribe('home/bedroom/temperature', () => console.log(arguments));
