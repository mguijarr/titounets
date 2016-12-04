import urllib2
from icalendar import cal

URL = "http://www.education.gouv.fr/download.php?file=http://cache.media.education.gouv.fr/ics/Calendrier_Scolaire_Zones_A_B_C.ics"
ACADEMY = "Grenoble"

def get_holidays():
    response = urllib2.urlopen(URL)

    ical_data = response.read()

    c = cal.Calendar()

    hols = []

    for e in c.from_ical(ical_data).walk("vevent"):
        if e.get('dtend'):
            if ACADEMY in e.get("location"):
                start = e.get("dtstart").dt
                end = e.get("dtend").dt
                hols.append({"start": [start.year, start.month, start.day],
                             "end": [end.year, end.month, end.day]})

    return hols



