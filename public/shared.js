/* 서버와 화면이 함께 쓰는 규칙 값 */
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m; else root.SHARED = m;
})(typeof self !== 'undefined' ? self : this, function () {
  const FLOORS = 20;
  const STD = ['주어', '목적어', '서술어', '보어', '관형어', '부사어', '독립어'];
  // 몬스터 공격력: 1~5층 3, 6~11층 5, 12~16층 10, 17~19층 15, 20층 20
  const DMG = f => f <= 5 ? 3 : f <= 11 ? 5 : f <= 16 ? 10 : f <= 19 ? 15 : 20;
  // 보물 층에서 얻는 아이템
  const TREASURE = { 5: { potion: 1, hint: 1 }, 10: { potion: 1, shield: 1 }, 15: { potion: 2, hint: 1 } };
  const ITEMS = {
    potion: { name: '회복 물약', desc: '체력 10 회복' },
    hint: { name: '현자의 힌트', desc: '힌트를 보고, 객관식이면 오답 2개를 지움' },
    shield: { name: '수호의 방패', desc: '다음 피해 1번을 막음' }
  };
  const HEAL = { potion: 10 };
  const MON = [null,
    { n: '초록 슬라임', b: 'slime', p: { a: '#6cc24a', b: '#3e8e2e', c: '#b6f08a' } },
    { n: '파란 슬라임', b: 'slime', p: { a: '#4aa3e0', b: '#2b6aa6', c: '#a9dcff' } },
    { n: '동굴 박쥐', b: 'bat', p: { a: '#6b5a8e', b: '#463a63' } },
    { n: '독버섯', b: 'mush', p: { a: '#c0392b', b: '#7a1f18' } },
    { n: '고블린 척후병', b: 'goblin', p: { a: '#7fb043', b: '#7a5232' } },
    { n: '해골 병사', b: 'skel', p: {} },
    { n: '떠도는 유령', b: 'ghost', p: { a: '#cfe3f0', b: '#9fb8cc', c: '#ffffff' } },
    { n: '슬라임 대장', b: 'slime', p: { a: '#d64545', b: '#8e2b2b', c: '#ff9a8a', r: '#ffd34f' }, crown: 1 },
    { n: '흡혈 박쥐', b: 'bat', p: { a: '#8e1e2e', b: '#5a1220', r: '#ffdd55' } },
    { n: '오크 전사', b: 'goblin', p: { a: '#5d7d3a', b: '#4a4a58', r: '#ffd34f' } },
    { n: '해골 기사', b: 'skel', p: { w: '#e8d9a8', r: '#4fd0ff', y: '#c0c0d0' } },
    { n: '돌 골렘', b: 'golem', p: { a: '#8d8a80', b: '#5e5b54', c: '#b7b3a7', r: '#4fd0ff' } },
    { n: '원한의 망령', b: 'ghost', p: { a: '#7a5aa8', b: '#4e3778', c: '#b79ae0', r: '#ff4fd8' } },
    { n: '흑기사', b: 'knight', p: { a: '#3a3a4a', b: '#24242f', c: '#6a6a80', r: '#ff3b3b' } },
    { n: '리치 마법사', b: 'lich', p: { a: '#3d2a5c', b: '#251a3a', k: '#0b0812', r: '#5fff8a', y: '#c9b04a', c: '#5fff8a' } },
    { n: '용암 골렘', b: 'golem', p: { a: '#7a2a1a', b: '#4a160c', c: '#ff8a2a', r: '#ffe14f' } },
    { n: '암흑 기사단장', b: 'knight', p: { a: '#5a1020', b: '#320812', c: '#c43a3a', r: '#ffd34f' } },
    { n: '대악마', b: 'demon', p: { a: '#a3202a', b: '#5e1016', y: '#ffd34f' } },
    { n: '리치 왕', b: 'lich', p: { a: '#1e1e2e', b: '#0f0f18', r: '#ff3b3b', y: '#f5c542', c: '#ff3b3b' } },
    { n: '고대의 흑룡', b: 'dragon', p: { a: '#2e2448', b: '#1c1630', c: '#b8423a', y: '#ffd34f' } }
  ];
  const PHASE = { ready: '입장 대기', fight: '전투 중', trap: '덫에 걸림', treasure: '보물 획득', won: '층 정복', dead: '쓰러짐', cleared: '선생님 구출' };
  const ASK = '밑줄 친 부분의 문장 성분은?';
  const ASK_TEXT = '밑줄 친 부분의 문장 성분을 쓰시오.';
  return { FLOORS, STD, DMG, TREASURE, ITEMS, HEAL, MON, PHASE, ASK, ASK_TEXT };
});
