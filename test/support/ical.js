function getVevents(context, ics) {
  const component = new context.ICAL.Component(context.ICAL.parse(ics));
  return component.getAllSubcomponents("vevent");
}

module.exports = {
  getVevents,
};
