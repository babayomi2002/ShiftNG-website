"""Builds privacy.html (interim app + website policy) and delete-account.html.

Source: the version 3 Privacy and Cookie Policy in the app repo
(C:/Dev/ShiftNG/documents/legal-drafts/pack_texts.py, BODY_1), adjusted so it
describes the app as it works TODAY (owner decision, 19 Nov 2026: publish as
interim while the lawyers and a DPCO review it). Where the reviewed text
describes app changes not yet built (first-launch choices, sign-up consent
record, crash-report switch, shorter retention), this version says what
happens now and what is coming. Re-run after the reviewed version is approved.
"""
import io
import re
import sys

sys.path.insert(0, 'C:/Dev/ShiftNG/documents/legal-drafts')
import pack_texts  # noqa: E402

SITE = 'C:/Dev/shiftng-website/'
TODAY = '19 November 2026'
ORG_TEXT = ('ShiftNG. The organisation behind ShiftNG is in the process of registering in Nigeria '
            'as a not-for-profit company; its registered name and address will be added here once '
            'registration is complete')

body = pack_texts.BODY_1.replace(pack_texts.ORG, ORG_TEXT)


def rep(old, new):
    global body
    assert body.count(old) == 1, old[:80]
    body = body.replace(old, new)


rep('<h1>ShiftNG Privacy and Cookie Policy</h1>\n<p class="small">Version <span class="fill">[1.0]</span>, effective <span class="fill">[date]</span>. This policy covers the ShiftNG app and the website shiftng.org.</p>',
    '<h1>Privacy and Cookie Policy</h1>\n<p class="muted">Interim version 1.0, published ' + TODAY + '. This policy covers the ShiftNG app and this website, shiftng.org. It is being reviewed by our lawyers and a licensed Data Protection Compliance Organisation, and may change as a result; any change will be posted here with a new date. Some choices it mentions are still being added to the app, and the policy says so where that applies.</p>')
rep(', a not-for-profit organisation in Nigeria. Our Data Protection Officer: <b>privacy@shiftng.org</b>.</li>',
    '. For any privacy question: <b>privacy@shiftng.org</b>.</li>')
rep('We ask your consent and explain the risks first (section 8).</li>',
    'Section 8 explains the risks.</li>')
rep('<li>The usage count and crash reports are <b>off unless you say yes</b>.</li>',
    '<li>The usage count can be <b>switched off</b> at any time in Profile. Crash reports carry <b>no names, email addresses, IP addresses or location</b>.</li>')
rep('The data controller is ' + ORG_TEXT + ' ("ShiftNG", "we"). Contact our Data Protection Officer at privacy@shiftng.org.',
    'The data controller is ' + ORG_TEXT + ' ("ShiftNG", "we"). For any privacy question write to privacy@shiftng.org; we are appointing a Data Protection Officer, who will answer at the same address.')
rep('<li>The usage count, only if you said yes (section 6).</li>\n<li>Crash reports, only if you said yes (section 7).</li>',
    '<li>The usage count, unless you switch it off (section 6).</li>\n<li>Crash reports, if the app goes wrong (section 7).</li>')
rep('<li>The version of our Terms and this policy you accepted, and when.</li>\n', '')
rep('<li>To count daily use and fix crashes, if you agreed.</li>',
    '<li>To count daily use (unless you switch it off) and to fix crashes.</li>')
rep('<tr><td>Usage count, crash reports, phone alerts</td><td>Consent, which you can withdraw at any time in Profile</td></tr>',
    '<tr><td>Usage count and crash reports</td><td>Legitimate interest in running and improving ShiftNG; you can switch the usage count off in Profile</td></tr>\n<tr><td>Phone alerts</td><td>Consent, which you can withdraw at any time</td></tr>')
rep('<tr><td>Transfers outside Nigeria</td><td>Your consent after the risks are explained (section 8)</td></tr>',
    '<tr><td>Transfers outside Nigeria</td><td>See section 8</td></tr>')
rep('<h2>6. The usage count (off unless you say yes)</h2>\n<p>When you first open the app we ask whether to share usage statistics. You can change your answer at any time in Profile. This is exactly what it does:</p>',
    '<h2>6. The usage count</h2>\n<p>The usage count is on unless you switch it off in Profile, which you can do at any time. In a coming update the app will ask you about it when you first open it. This is exactly what it does:</p>')
rep('The code is replaced every 13 months. Daily records are deleted after six months, and only totals are kept.',
    'The code is replaced every 13 months. Daily records are kept for up to 25 months and then turned into totals only; we are reducing this to six months.')
rep('<h2>7. Crash reports (off unless you say yes)</h2>\n<p>If you agree, and the app crashes, it sends a report',
    '<h2>7. Crash reports</h2>\n<p>If the app crashes or goes wrong, it sends a report')
rep('Reports carry no names, email addresses or IP addresses, and no screen recordings. They are kept for <span class="fill">[90 days]</span>.</p>',
    'Reports carry no names, email addresses, IP addresses or location, and no screenshots or screen recordings. They are kept for up to 90 days. In a coming update you will be able to switch crash reports off in Profile.</p>')
rep('<tr><td>Sentry</td><td>Crash reports, if you agree</td><td>Germany (EU)</td></tr>',
    '<tr><td>Sentry</td><td>Crash reports</td><td>Germany (EU)</td></tr>')
rep('<tr><td>Namecheap</td><td>Our email</td><td><span class="fill">[confirm]</span></td></tr>',
    '<tr><td>Namecheap</td><td>Our email</td><td>Namecheap\'s data centres, outside Nigeria</td></tr>')
rep('The Nigeria Data Protection Commission has not yet decided that these countries give adequate protection, so we ask your consent before your data goes there: when you first open the app, and when you sign up. The risks are',
    'The Nigeria Data Protection Commission has not yet decided that these countries give adequate protection. In a coming update the app will ask your consent, after explaining the risks, when you first open it and when you sign up. The risks are')
rep('If you do not agree, you can still read ShiftNG\'s public information on the website shiftng.org, which sets no cookies.</p>',
    'If you do not want your data to go to these providers, you can read ShiftNG\'s public information on this website without giving any personal data.</p>')
rep('<p><b>Website.</b> shiftng.org uses no cookies, no analytics and no advertising or tracking tools.</p>',
    '<p><b>Website.</b> shiftng.org uses no cookies, no analytics and no advertising or tracking tools. It has no sign-in, and apart from its search boxes, no forms. The one page that contacts our database is <b>Search all of Nigeria</b> on the Civic page: it sends your search words and filters to our database (Supabase, Ireland), which also receives your IP address and keeps technical logs with it for up to 7 days to run and protect the service. We do not store what you searched for or use these logs to identify anyone. Every other page uses files served from shiftng.org. The website is hosted by GitHub Pages, which receives your IP address when a page loads. News stories, budget documents and election pages link to the websites that published them, which have their own privacy policies.</p>')
rep('<tr><td>The usage-count code and the last day it was sent; your choice</td><td>Section 6</td><td>Yes</td></tr>',
    '<tr><td>The usage-count code and the last day it was sent; your choice</td><td>Section 6</td><td>No: on unless you switch it off in Profile</td></tr>')
rep('and change your choices for the usage count and crash reports.',
    'and switch the usage count off. You can also ask us to delete your account without the app: see <a href="delete-account.html">Deleting your account</a>.')
rep('<tr><td>Suggested ward councillors</td><td>Six months after review</td></tr>',
    '<tr><td>Suggested ward councillors</td><td>Until reviewed; we are introducing a limit of six months after review</td></tr>')
rep('<tr><td>Usage count</td><td>Code renewed every 13 months; daily records six months, then totals only</td></tr>',
    '<tr><td>Usage count</td><td>Code renewed every 13 months; daily records up to 25 months (being reduced to six), then totals only</td></tr>')
rep('<p>We will post any change here with a new version number and date.',
    '<p>This is an interim version while our lawyers and Data Protection Compliance Organisation review it. We will post any change here with a new version number and date.')
assert 'class="fill"' not in body, re.findall(r'<span class="fill">.*?</span>', body)
body = body.replace('<p class="small">', '<p class="muted">')

page = io.open(SITE + 'privacy.html', encoding='utf-8').read()
head, rest = page.split('<main class="page">', 1)
foot = '</main>' + rest.split('</main>', 1)[1]
desc = 'How ShiftNG handles your information in the app and on this website. Interim version, under legal review.'
head = re.sub(r'<title>.*?</title>', '<title>Privacy and Cookie Policy: ShiftNG</title>', head)
head = re.sub(r'(<meta name="description" content=")[^"]*', r'\g<1>' + desc, head)
head = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>Privacy and Cookie Policy: ShiftNG', head)
head = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\g<1>' + desc, head)


def indent(html):
    return '\n'.join(('    ' + l) if l.strip() else '' for l in html.strip().split('\n'))


io.open(SITE + 'privacy.html', 'w', encoding='utf-8', newline='\n').write(
    head + '<main class="page">\n  <div class="wrap prose">\n' + indent(body) + '\n  </div>\n' + foot)

# --- delete-account.html ----------------------------------------------------
DEL = '''<h1>Deleting your ShiftNG account</h1>
<p class="muted">Last updated: ''' + TODAY + '''. This page explains how to delete your ShiftNG account and what happens to your information. It applies to the ShiftNG app on Android and iPhone.</p>

<h2>In the app (quickest)</h2>
<ol>
<li>Open ShiftNG and sign in.</li>
<li>Go to <b>Profile</b>, then <b>Your data</b>.</li>
<li>Tap <b>Delete my account</b>, choose what happens to your project reports, and confirm.</li>
</ol>
<p>Your account is deleted straight away. You can also tap <b>Download my data</b> first to keep a copy.</p>

<h2>Without the app</h2>
<p>Email <a href="mailto:privacy@shiftng.org?subject=Delete%20my%20ShiftNG%20account">privacy@shiftng.org</a> from the email address you use for ShiftNG, with the subject "Delete my ShiftNG account". We check that the request comes from the account's address, delete the account, and confirm by email within one month (usually much sooner).</p>

<h2>What is deleted</h2>
<ul>
<li>Your email address and sign-in.</li>
<li>Your profile: name and where you live.</li>
<li>Your Academy progress.</li>
<li>Posts you reported, and ward councillors you suggested.</li>
<li>The link between your app use and your account.</li>
<li>Your project reports, replies and photos, unless you choose to keep them as an anonymous public record that is no longer linked to you.</li>
</ul>

<h2>What may be kept, and for how long</h2>
<ul>
<li><b>Election volunteers:</b> your volunteer record, location stamps and the link between your reports and you are kept for 12 months after the election, the period in which election petitions and appeals are decided. Your phone number is deleted 30 days after the election, or at once if you withdraw. Checked result sheets stay as a public record of the election, without your name.</li>
<li><b>Audit record:</b> a record of actions taken on your account is kept for 12 months, for security.</li>
<li><b>Backups:</b> our encrypted backups are replaced within 35 days, after which no copy remains.</li>
<li><b>Complaints and legal claims:</b> where content is the subject of one, a restricted copy may be kept until it is resolved.</li>
</ul>
<p>See our <a href="privacy.html">Privacy and Cookie Policy</a> for more, or write to <a href="mailto:privacy@shiftng.org">privacy@shiftng.org</a>. If you are not satisfied with our answer, you can complain to the Nigeria Data Protection Commission.</p>
'''
dhead = re.sub(r'<title>.*?</title>', '<title>Deleting your account: ShiftNG</title>', head)
ddesc = 'How to delete your ShiftNG account, in the app or by email, and what happens to your information.'
dhead = re.sub(r'(<meta name="description" content=")[^"]*', r'\g<1>' + ddesc, dhead)
dhead = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>Deleting your account: ShiftNG', dhead)
dhead = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\g<1>' + ddesc, dhead)
io.open(SITE + 'delete-account.html', 'w', encoding='utf-8', newline='\n').write(
    dhead + '<main class="page">\n  <div class="wrap prose">\n' + indent(DEL) + '\n  </div>\n' + foot)
print('privacy.html and delete-account.html written')
