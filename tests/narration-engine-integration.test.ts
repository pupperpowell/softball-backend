import { describe, it, expect } from 'bun:test';
import { EventLog } from '../game/EventLog';
import { HalfInning } from '../game/events/types';

describe('NarrationEngine Integration Tests', () => {
  it('should use NarrationEngine for pitch events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('pitchThrown', 1, HalfInning.Top, {
      pitcherId: 'john-smith',
      batterId: 'jane-doe',
      pitchNumber: 1,
      pitchType: 'fastball',
      speed: 85,
      location: { x: 0, y: 0, z: 0 },
      isStrike: true,
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    // NarrationEngine generates narrations like "Smith throws..."
    expect(narration).toBeTruthy();
    expect(narration).toContain('Smith');
    console.log('✓ Pitch narration:', narration);
  });

  it('should use NarrationEngine for contact events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('contactMade', 1, HalfInning.Top, {
      batterId: 'jane-doe',
      exitVelocity: 95,
      launchAngle: 25,
      azimuth: 0,
      projectedDistance: 250,
      hitType: 'flyBall',
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    expect(narration).toContain('makes contact');
    console.log('✓ Contact narration:', narration);
  });

  it('should use NarrationEngine for hit events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('hitRecorded', 1, HalfInning.Top, {
      batterId: 'jane-doe',
      hitType: 'single',
      rbi: 1,
      runnersAdvanced: [1],
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    // NarrationEngine should use narratePlayResult which says "reaches first base"
    expect(narration).toContain('first base');
    console.log('✓ Hit narration:', narration);
  });

  it('should use NarrationEngine for out events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('outRecorded', 1, HalfInning.Top, {
      playerId: 'jane-doe',
      outType: 'flyout',
      fielderId: 'john-smith',
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    // NarrationEngine narratePlayResult generates "catches the ball for an out"
    expect(narration).toContain('catches the ball');
    console.log('✓ Out narration:', narration);
  });

  it('should use NarrationEngine for walk events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('walk', 1, HalfInning.Top, {
      batterId: 'jane-doe',
      fullCount: true,
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    expect(narration).toContain('walk');
    console.log('✓ Walk narration:', narration);
  });

  it('should use NarrationEngine for strikeout events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('strikeout', 1, HalfInning.Top, {
      batterId: 'jane-doe',
      swinging: true,
      pitchNumber: 5,
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    expect(narration).toContain('strikes out');
    console.log('✓ Strikeout narration:', narration);
  });

  it('should use NarrationEngine for run scoring events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('runScores', 1, HalfInning.Top, {
      runnerId: 'jane-doe',
      scoringTeam: 'Home Team',
      rbiBatterId: 'john-smith',
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    expect(narration).toMatch(/1 run scores/i);
    console.log('✓ Run scores narration:', narration);
  });

  it('should use NarrationEngine for homerun events', () => {
    const eventLog = new EventLog(true);
    
    eventLog.addEvent('homerun', 1, HalfInning.Top, {
      batterId: 'jane-doe',
      rbi: 2,
      distance: 380,
      direction: 'center field',
    });
    
    const events = eventLog.getEvents();
    const narration = events[0].narration!;
    
    expect(narration).toBeTruthy();
    expect(narration).toMatch(/home run|park/i);
    console.log('✓ Homerun narration:', narration);
  });
});