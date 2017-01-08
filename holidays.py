import urllib2
from icalendar import cal

URL = "http://www.education.gouv.fr/download.php?file=http://cache.media.education.gouv.fr/ics/Calendrier_Scolaire_Zones_A_B_C.ics"
ACADEMY = "Grenoble"

def get_holidays():
    response = urllib2.urlopen(URL)

    ical_data = response.read()

    c = cal.Calendar()

    hols = []
    summer_hols = {}

    for e in c.from_ical(ical_data).walk("vevent"):
        if e.get('dtend'):
            if ACADEMY in e.get("location"):
                start = e.get("dtstart").dt
                end = e.get("dtend").dt
                hols.append({"start": [start.year, start.month, start.day],
                             "end": [end.year, end.month, end.day]})
        if "Vacances d'" in e.get('description'):
            d = e.get("dtstart").dt
            summer_hols["start"] = [d.year, d.month, d.day]
        elif 'Rentr' in e.get('description'):
            d = e.get("dtstart").dt
            summer_hols["end"] = [d.year, d.month, d.day]
            if len(summer_hols) == 2:
                hols.append(summer_hols)
            summer_hols = {}

    return hols

if __name__ == '__main__':
    print get_holidays()


