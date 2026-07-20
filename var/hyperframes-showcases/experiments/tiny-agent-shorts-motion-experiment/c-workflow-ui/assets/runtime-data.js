window.TinyAgentExperiment = (() => {
  const data = {
  "audioDurationSeconds": 38.808,
  "videoDurationSeconds": 38.808,
  "ctaStartSeconds": 33.468,
  "phases": [
    {
      "id": "hook",
      "start": 0,
      "end": 3.625
    },
    {
      "id": "activity-not-outcome",
      "start": 3.625,
      "end": 7.333
    },
    {
      "id": "concrete-artifact",
      "start": 7.333,
      "end": 12.125
    },
    {
      "id": "three-inputs",
      "start": 12.125,
      "end": 19.885
    },
    {
      "id": "done-use-stop",
      "start": 19.885,
      "end": 25.02
    },
    {
      "id": "tiny-rule",
      "start": 25.02,
      "end": 29.874
    },
    {
      "id": "executable-task",
      "start": 29.874,
      "end": 33.468
    },
    {
      "id": "cta",
      "start": 33.468,
      "end": 38.808
    }
  ],
  "captions": [
    {
      "startSeconds": 0.1,
      "endSeconds": 3.625,
      "text": "Most agent tasks fail\nbefore the agent starts.",
      "spokenText": "Most agent tasks fail before the agent starts."
    },
    {
      "startSeconds": 3.625,
      "endSeconds": 6.285,
      "text": "Help with the launch\nnames an activity,",
      "spokenText": "Help with the launch names an activity,"
    },
    {
      "startSeconds": 6.285,
      "endSeconds": 7.333,
      "text": "not an outcome.",
      "spokenText": "not an outcome."
    },
    {
      "startSeconds": 7.333,
      "endSeconds": 10.269,
      "text": "Give the agent one\nconcrete artifact: Draft a",
      "spokenText": "Give the agent one concrete artifact: Draft a"
    },
    {
      "startSeconds": 10.269,
      "endSeconds": 12.124,
      "text": "review-ready launch brief.",
      "spokenText": "review-ready launch brief."
    },
    {
      "startSeconds": 12.125,
      "endSeconds": 13.244,
      "text": "Then add the source",
      "spokenText": "Then add the source"
    },
    {
      "startSeconds": 13.244,
      "endSeconds": 14.991,
      "text": "materials that\nmay change the",
      "spokenText": "materials that may change the"
    },
    {
      "startSeconds": 14.991,
      "endSeconds": 18.137,
      "text": "answer, the hard constraints\nit cannot cross, and the",
      "spokenText": "answer, the hard constraints it cannot cross, and the"
    },
    {
      "startSeconds": 18.137,
      "endSeconds": 19.885,
      "text": "evidence a\nreviewer must see.",
      "spokenText": "evidence a reviewer must see."
    },
    {
      "startSeconds": 19.885,
      "endSeconds": 23.084,
      "text": "Now the agent knows what\ndone looks like, what",
      "spokenText": "Now the agent knows what done looks like, what"
    },
    {
      "startSeconds": 23.084,
      "endSeconds": 25.02,
      "text": "it may use, and\nwhen to stop.",
      "spokenText": "it may use, and when to stop."
    },
    {
      "startSeconds": 25.02,
      "endSeconds": 27.649,
      "text": "Tiny rule:\nartifact, context,",
      "spokenText": "Tiny rule: artifact, context,"
    },
    {
      "startSeconds": 27.649,
      "endSeconds": 29.874,
      "text": "constraints, review bar.",
      "spokenText": "constraints, review bar."
    },
    {
      "startSeconds": 29.874,
      "endSeconds": 33.468,
      "text": "That turns a vague prompt\ninto an executable task.",
      "spokenText": "That turns a vague prompt into an executable task."
    }
  ]
};
  function mountCaptions(shell) {
    data.captions.forEach((cue, index) => {
      const element = document.createElement('div');
      element.id = `caption-cue-${String(index + 1).padStart(2, '0')}`;
      element.className = 'clip realtime-caption';
      element.dataset.start = String(cue.startSeconds);
      element.dataset.duration = String(Number((cue.endSeconds - cue.startSeconds).toFixed(3)));
      element.dataset.trackIndex = '81';
      element.textContent = cue.text;
      shell.appendChild(element);
    });
  }
  return Object.freeze({ data, mountCaptions });
})();
