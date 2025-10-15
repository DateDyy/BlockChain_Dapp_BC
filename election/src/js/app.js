App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      App.contracts.Election = TruffleContract(election);
      App.contracts.Election.setProvider(App.web3Provider);
      App.listenForEvents();
      return App.render();
    });
  },

  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      instance.votedEvent({}, {
        fromBlock: 'latest' // Chỉ cần nghe từ block mới nhất
      }).watch(function(error, event) {
        console.log("event triggered", event);
        App.render();
      });
    });
  },

  render: function() {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Tài khoản của bạn: " + account);
      }
    });

    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var promises = [];
      for (var i = 1; i <= candidatesCount; i++) {
        promises.push(electionInstance.candidates(i));
      }

      // Đợi tất cả thông tin ứng viên được tải về
      Promise.all(promises).then(function(candidates) {
        candidates.forEach(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          // === PHẦN THAY ĐỔI QUAN TRỌNG: TẠO CARD THAY VÌ TABLE ROW ===
          var candidateTemplate = `
            <div class='card'>
              <h3>${name}</h3>
              <p>Số phiếu: ${voteCount}</p>
              <button onclick="App.castVote(${id}); return false;">Bỏ phiếu</button>
            </div>`;
          candidatesResults.append(candidateTemplate);
        });
      });

      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      App.hasVoted = hasVoted;
      if (App.hasVoted) {
        // Ẩn tất cả các nút vote và hiển thị thông báo
        $('#content button').hide();
        $('#voteMessage').html("<h3 style='color: #28a745;'>Cảm ơn! Bạn đã bỏ phiếu.</h3>");
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function(candidateId) {
    if (App.hasVoted) {
      alert("Bạn đã bỏ phiếu rồi!");
      return;
    }
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(result) {
      // Khi vote thành công, gọi hiệu ứng pháo hoa!
      startFireworks();
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
      alert("Giao dịch thất bại hoặc bị từ chối.");
    });
  }
};

$(function() {
  $(window).on('load', function() {
    App.init();
  });
});


// ==========================
// 🎆 HIỆU ỨNG PHÁO HOA
// Dán toàn bộ code pháo hoa từ file ví dụ vào đây
// ==========================
const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createFirework(x, y) {
  for (let i = 0; i < 80; i++) {
    particles.push({
      x, y,
      angle: Math.random() * 2 * Math.PI,
      speed: Math.random() * 5 + 2,
      radius: 2,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`,
      life: 60 + Math.random() * 30
    });
  }
}

function renderFireworks() {
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  particles.forEach((p, i) => {
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed + 0.5; // hiệu ứng rơi
    p.life--;
    p.speed *= 0.98; // chậm dần
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, 2*Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    if (p.life <= 0) particles.splice(i, 1);
  });
  requestAnimationFrame(renderFireworks);
}

function startFireworks() {
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height / 2;
  createFirework(x, y);
}

// Khởi động vòng lặp vẽ
renderFireworks();
