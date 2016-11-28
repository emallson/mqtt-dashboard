var React = require('react');
var ReactDOM = require('react-dom');
var ch = require('color-hash');

var hasher = new ch({saturation: 0.25, lightness: 0.6});
export class DeviceBlock extends React.PureComponent {
  render() {
    var subs = null;
    if(this.props.device.get("subscribes").size > 0) {
      subs = (
        <div className="subscriptions">
          {this.props.device.get("subscribes").map((topic) => <code key={topic}>{topic}</code>).toArray()}
        </div>
      );
    }
    var pubs = null;
    if(this.props.device.get("publishes").size > 0) {
      pubs = <div className="publishes">
        {this.props.device.get("publishes").map((topic) => <code key={topic}>{topic}</code>).toArray()}
      </div>;
    }
    var classname = "device-block";

    if(!this.props.alive) {
      classname += " disabled";
    }
    return (
      <div className={classname} style={{borderColor: hasher.hex(this.props.device.get("type"))}}>
        <div className="title" style={{backgroundColor: hasher.hex(this.props.device.get("type"))}}>
          <h3>{this.props.device.get("type")}</h3>
        </div>
        <div className="body">
          {this.props.device.get("description")}
        </div>
        {pubs}
        {subs}
      </div>
    );
  }
}

export class DeviceDescriptionRegion extends React.PureComponent {
  render() {
    return (
      <div className="device-block-region">
        {this.props.devices.map((device, key) => <DeviceBlock key={key} device={device} alive={this.props.alive.get(key, false)} />).toArray()}
      </div>
    );
  }
}
