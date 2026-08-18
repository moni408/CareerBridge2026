import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { GeneratedCV, sanitizeTechStack } from '../services/geminiService';

const PRIMARY_PURPLE = '#5b21b6'; // Matching exact purple heading color from reference screenshot
const TEXT_DARK = '#1f2937';
const TEXT_MUTED = '#4b5563';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: TEXT_DARK,
    lineHeight: 1.45,
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: PRIMARY_PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    fontSize: 8.5,
    color: TEXT_MUTED,
    gap: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginTop: 10,
    marginBottom: 12,
  },
  section: {
    marginTop: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: PRIMARY_PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  summary: {
    fontSize: 9,
    color: TEXT_DARK,
    textAlign: 'justify',
    lineHeight: 1.4,
  },
  entry: {
    marginBottom: 8,
  },
  entryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  entryTitle: {
    fontWeight: 700,
    fontSize: 9.5,
    color: TEXT_DARK,
  },
  entrySub: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  bullet: {
    flexDirection: 'row',
    marginTop: 2,
    paddingLeft: 6,
  },
  bulletDot: {
    width: 10,
    fontSize: 9,
    color: TEXT_DARK,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: TEXT_DARK,
    lineHeight: 1.35,
  },
  skillCategory: {
    marginBottom: 3,
    fontSize: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillLabel: {
    fontWeight: 700,
    color: TEXT_DARK,
  },
  skillList: {
    fontWeight: 400,
    color: TEXT_DARK,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    textAlign: 'center',
    fontSize: 7.5,
    color: '#9CA3AF',
  }
});

interface Props {
  data: GeneratedCV;
}

export const CVDocument = ({ data }: Props) => {
  const fullName = data?.fullName || 'Candidate Name';
  const email = data?.email ? String(data.email).toLowerCase() : '';
  const phone = data?.phone || '';
  const location = data?.location || '';
  const linkedin = data?.linkedin || '';
  const github = data?.github || '';
  const portfolio = data?.portfolio || '';
  const summary = data?.summary || '';

  const experiences = Array.isArray(data?.experience) ? data.experience : [];
  const educations = Array.isArray(data?.education) ? data.education : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const rawSkills = Array.isArray(data?.skills) ? data.skills : [];
  
  const languages = Array.isArray(data?.languages) 
    ? data.languages 
    : data?.languages ? [String(data.languages)] : [];
  
  const interests = Array.isArray(data?.interests) 
    ? data.interests 
    : data?.interests ? [String(data.interests)] : [];
    
  const certifications = Array.isArray(data?.certifications) 
    ? data.certifications 
    : data?.certifications ? [String(data.certifications)] : [];

  // Contact line elements
  const contactParts: string[] = [];
  if (location) contactParts.push(location);
  if (email) contactParts.push(`Email: ${email}`);
  if (phone) contactParts.push(`Phone: ${phone}`);
  if (linkedin) contactParts.push(`LinkedIn: ${linkedin}`);
  if (github) contactParts.push(`GitHub: ${github}`);
  if (portfolio) contactParts.push(`Portfolio: ${portfolio}`);

  const sections: React.ReactElement[] = [];

  // 1. PROFESSIONAL SUMMARY
  if (summary) {
    sections.push(
      <View key="summary" style={styles.section}>
        <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
    );
  }

  // 2. EDUCATION
  if (educations.length > 0) {
    sections.push(
      <View key="education" style={styles.section}>
        <Text style={styles.sectionTitle}>EDUCATION</Text>
        {educations.map((edu, i) => {
          const degreeStr = edu?.degree || 'Degree';
          const schoolStr = edu?.school || 'University';
          const courseworkStr = edu?.coursework || edu?.gpa ? `GPA: ${edu.gpa}` : '';
          return (
            <View key={i} style={styles.entry}>
              <View style={styles.entryTitleRow}>
                <Text style={styles.entryTitle}>
                  {degreeStr} | <Text style={{ fontWeight: 400 }}>{schoolStr}</Text>
                </Text>
                {edu?.year && <Text style={styles.entrySub}>{edu.year}</Text>}
              </View>
              {courseworkStr ? (
                <View style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={{ fontWeight: 700 }}>Relevant Coursework: </Text>
                    {courseworkStr}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  // 3. TECHNICAL SKILLS
  if (rawSkills.length > 0) {
    sections.push(
      <View key="skills" style={styles.section}>
        <Text style={styles.sectionTitle}>TECHNICAL SKILLS</Text>
        {rawSkills.map((skillGroup, i) => {
          if (typeof skillGroup === 'string') {
            return (
              <View key={i} style={styles.skillCategory}>
                <Text style={styles.skillList}>• {skillGroup}</Text>
              </View>
            );
          }
          const category = skillGroup?.category || 'Skills';
          const items = Array.isArray(skillGroup?.items) 
            ? skillGroup.items.join(', ') 
            : String(skillGroup?.items || '');

          return (
            <View key={i} style={styles.skillCategory}>
              <Text style={styles.skillLabel}>{category}: </Text>
              <Text style={styles.skillList}>{items}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // 4. PROJECTS
  if (projects.length > 0) {
    sections.push(
      <View key="projects" style={styles.section}>
        <Text style={styles.sectionTitle}>PROJECTS</Text>
        {projects.map((proj, i) => {
          const cleanStack = sanitizeTechStack(proj?.techStack);
          const techStackStr = cleanStack.join(', ');
          
          const titleLine = [proj?.name || proj?.title || 'Project', proj?.subtitle, techStackStr]
            .filter(Boolean)
            .join(' | ');

          const bullets = Array.isArray(proj?.description) 
            ? proj.description 
            : proj?.description 
            ? [String(proj.description)] 
            : [];

          return (
            <View key={i} style={styles.entry}>
              <Text style={styles.entryTitle}>{titleLine}</Text>
              {bullets.map((bullet, bi) => (
                <View key={bi} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  // 5. EXPERIENCE
  if (experiences.length > 0) {
    sections.push(
      <View key="experience" style={styles.section}>
        <Text style={styles.sectionTitle}>EXPERIENCE</Text>
        {experiences.map((exp, i) => {
          const bullets = Array.isArray(exp?.description) 
            ? exp.description 
            : exp?.description 
            ? [String(exp.description)] 
            : [];
          
          const headerLine = [exp?.company, exp?.role, exp?.location, exp?.duration]
            .filter(Boolean)
            .join(' | ');

          return (
            <View key={i} style={styles.entry}>
              <Text style={styles.entryTitle}>{headerLine}</Text>
              {bullets.map((bullet, bi) => (
                <View key={bi} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  // 6. CERTIFICATIONS & ACHIEVEMENTS
  if (certifications.length > 0) {
    sections.push(
      <View key="certifications" style={styles.section}>
        <Text style={styles.sectionTitle}>CERTIFICATIONS & ACHIEVEMENTS</Text>
        {certifications.map((cert, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{cert}</Text>
          </View>
        ))}
      </View>
    );
  }

  // 7. LANGUAGES
  if (languages.length > 0) {
    sections.push(
      <View key="languages" style={styles.section}>
        <Text style={styles.sectionTitle}>LANGUAGES</Text>
        <View style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{languages.join(' | ')}</Text>
        </View>
      </View>
    );
  }

  // 8. INTERESTS & GOALS
  if (interests.length > 0) {
    sections.push(
      <View key="interests" style={styles.section}>
        <Text style={styles.sectionTitle}>INTERESTS & GOALS</Text>
        {interests.map((interest, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{interest}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Document title={`${fullName} - CV`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={{ fontSize: 8.5, color: TEXT_MUTED }}>
            {contactParts.join('  |  ')}
          </Text>
        </View>
        
        <View style={styles.divider} />

        {sections}

        <Text style={styles.footer} fixed>
          Generated via CareerBridge • Page 1
        </Text>
      </Page>
    </Document>
  );
};
