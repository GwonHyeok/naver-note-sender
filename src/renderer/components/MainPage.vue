<template>
    <div>
        <nav class="navbar" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
                <p class="navbar-item has-text-black has-text-weight-semibold">
                    네이버 쪽지 보내기
                </p>
                <button class="button navbar-burger" v-on:click="openSettingModal">
                    <i class="fa fa-cog fa-lg" aria-hidden="true"></i>
                </button>
            </div>
        </nav>

        <section class="hero">
            <div class="hero-body">

                <div class="columns">

                    <!-- 프록시 정보 -->
                    <div class="column is-6">
                        <div class="columns">
                            <div class="column is-3 has-text-centered">
                                <div id="title-proxy-list" class="title is-6 is-fullwidth is-white">프록시 리스트</div>
                            </div>
                            <div class="column is-3">
                                <div class="file is-primary is-fullwidth file-proxies has-text-centered">
                                    <label class="file-label is-fullwidth">
                                        <input class="file-input" type="file" name="resume" accept=".txt"
                                               v-on:change="openProxyFromFile">
                                        <span class="file-cta">
                                        <span class="file-label is-fullwidth">
                                            파일 선택
                                        </span>
                                    </span>
                                    </label>
                                </div>
                            </div>
                            <div class="column is-3">
                                <p class="button is-fullwidth is-primary" v-on:click="openProxyModal()">추가하기</p>
                            </div>
                            <div class="column is-3">
                                <p class="button is-fullwidth is-info" v-on:click="updateProxyStatus()">작동확인</p>
                            </div>
                        </div>
                        <table class="table is-hoverable is-fullwidth">
                            <thead>
                            <tr>
                                <th>아이피</th>
                                <th>포트</th>
                                <th>지연률</th>
                                <th v-on:click="clearProxies">삭제</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(proxy, index) in proxies">
                                <td>{{proxy.ip}}</td>
                                <td>{{proxy.port}}</td>
                                <td :class="getProxyStateClasses(proxy)">{{proxy.responseTimeMills}}ms</td>
                                <td><a v-on:click="removeProxy(index)" class="delete is-small"></a></td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- 쪽지 전송 정보 -->
                    <div class="column is-6">
                        <div class="field">
                            <label class="label">유저 파일 업로드</label>
                            <div class="file is-primary">
                                <label class="file-label">
                                    <input class="file-input" type="file" name="resume" accept=".csv"
                                           v-on:change="onChangeUserFile">
                                    <span class="file-cta">
                                        <span class="file-icon">
                                            <i class="fa fa-upload"></i>
                                        </span>
                                        <span class="file-label">
                                            csv 파일 선택…
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="field">
                            <label class="label">쪽지 내용</label>
                            <div class="control">
                                <textarea class="textarea" placeholder="쪽지 내용을 적어주세요" v-model="message"></textarea>
                            </div>
                        </div>

                        <div class="control">
                            <button class="button is-link is-fullwidth" v-on:click="requestSendMessage">쪽지 보내기
                            </button>
                        </div>
                    </div>
                </div>

                <div class="group-user-info">
                    <div class="columns">
                        <div class="column">
                            <p class="title is-4">유저 정보</p>
                        </div>
                        <div class="column is-offset-7">
                            <button class="button is-primary" v-on:click="saveResult">
                                <span class="file-icon">
                                    <i class="fa fa-download"></i>
                                </span>
                                결과 파일로 저장
                            </button>
                        </div>
                    </div>
                    <table class="table is-hoverable is-fullwidth">
                        <thead>
                        <tr>
                            <th>아이디</th>
                            <th>사용된 프록시</th>
                            <th>사용된 아이디</th>
                            <th>전송 성공 여부</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="(user, index) in users">
                            <td>{{user.id}}</td>
                            <td>{{user.usedProxy}}</td>
                            <td>{{user.usedNaverUser}}</td>
                            <td>{{user.isSuccess === null ? '전송전' : user.isSuccess === true ? '성공' : '실패'}}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 프록시 추가 모달 -->
            <div class="modal" :class="{'is-active': isActiveProxyModal}">
                <div class="modal-background"></div>
                <div class="modal-card">
                    <header class="modal-card-head">
                        <p class="modal-card-title">프록시 추가하기</p>
                        <button class="delete" aria-label="close"></button>
                    </header>
                    <section class="modal-card-body">
                        <div class="field">
                            <label class="label">아이피</label>
                            <div class="control">
                                <input class="input" type="text" placeholder="1.2.3.4" v-model="proxyModalInputIp">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">포트</label>
                            <div class="control">
                                <input class="input" type="email" placeholder="8088" v-model="proxyModalInputPort">
                            </div>
                        </div>
                    </section>
                    <footer class="modal-card-foot">
                        <button class="button is-success" v-on:click="addProxyItem">추가</button>
                        <button class="button" v-on:click="closeProxyModal">취소</button>
                    </footer>
                </div>
            </div>

            <!-- 설정 모달 -->
            <div class="modal" :class="{'is-active': isActiveSettingModal}">
                <div class="modal-background"></div>
                <div class="modal-card">
                    <header class="modal-card-head">
                        <p class="modal-card-title">설정</p>
                        <button class="delete" aria-label="close" v-on:click="closeSettingModal"></button>
                    </header>
                    <section class="modal-card-body">
                        <p class="title is-5">네이버 계정</p>
                        <table class="table is-hoverable is-fullwidth">
                            <thead>
                            <tr>
                                <th>아이디</th>
                                <th>비밀번호</th>
                                <th>삭제</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(user, index) in naverUsers">
                                <td>{{user.id}}</td>
                                <td>{{user.password}}</td>
                                <td><a v-on:click="removeNaverUser(index)" class="delete is-small"></a></td>
                            </tr>
                            </tbody>
                        </table>

                        <!-- 네이버 계정 추가 -->
                        <div class="field is-horizontal">
                            <div class="field-body">
                                <div class="field">
                                    <p class="control is-expanded has-icons-left">
                                        <input class="input" type="text" placeholder="아이디"
                                               v-model="settingModalNaverInputId">
                                        <span class="icon is-small is-left">
                                            <i class="fa fa-user"></i>
                                        </span>
                                    </p>
                                </div>
                                <div class="field">
                                    <p class="control is-expanded has-icons-left has-icons-right">
                                        <input type="password" class="input" placeholder="비밀번호"
                                               v-model="settingModalNaverInputPassword">
                                        <span class="icon is-small is-left">
                                              <i class="fa fa-key"></i>
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div class="field-label">
                                <button v-on:click="addNaverUser" id="button-add-naver-user"
                                        class="button is-primary is-fullwidth">계정 추가
                                </button>
                            </div>
                        </div>
                    </section>
                    <footer class="modal-card-foot">
                        <button class="button is-success" v-on:click="closeSettingModal">확인</button>
                    </footer>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
  export default {
    name: 'main-page',
    methods: {
      onChangeUserFile (e) {
        const files = e.target.files || e.dataTransfer.files
        if (files.length === 0) return alert('파일을 선택해주세요')

        // 파일 확장자 확인
        const file = files[0]
        if (file.path.indexOf('.csv') === -1) return alert('csv 파일만 지원합니다')

        // 유저 정보를 csv 에서 요청
        this.$electron.ipcRenderer.send('request-users-from-csv', file.path)
      },
      openProxyFromFile (e) {
        const files = e.target.files || e.dataTransfer.files
        if (files.length === 0) return alert('파일을 선택해주세요')

        // 파일 확장자 확인
        const file = files[0]
        if (file.path.indexOf('.txt') === -1) return alert('txt 파일만 지원합니다')

        // 프록시 정보를 csv 에서 요청
        this.$electron.ipcRenderer.send('request-proxies-from-file', file.path)
      },
      openProxyModal () {
        this.isActiveProxyModal = true
      },
      closeProxyModal () {
        this.isActiveProxyModal = false
      },
      addProxyItem () {
        this.proxies.push({ip: this.proxyModalInputIp, port: this.proxyModalInputPort, responseTimeMills: 0})
        this.closeProxyModal()
      },
      clearProxies () {
        this.proxies = []
      },
      updateProxyStatus () {
        this.$electron.ipcRenderer.send('request-check-proxies', this.proxies)
      },
      removeProxy (proxyIndex) {
        this.proxies.splice(proxyIndex, 1)
      },
      getProxyStateClasses (proxy) {
        if (proxy.isActive && proxy.responseTimeMills <= 400) return {'is-green': true}
        else if (proxy.isActive && proxy.responseTimeMills <= 1000) return {'is-orange': true}
        else if (proxy.isActive) return {'is-red': true}
        else return {'is-die': true}
      },
      requestSendMessage () {
        this.$electron.ipcRenderer.send('request-send-message', this.naverUsers, this.proxies, this.users, this.message)
      },
      openSettingModal () {
        this.isActiveSettingModal = true
      },
      closeSettingModal () {
        this.isActiveSettingModal = false
      },
      addNaverUser () {
        this.naverUsers.push({id: this.settingModalNaverInputId, password: this.settingModalNaverInputPassword})
        this.settingModalNaverInputId = ''
        this.settingModalNaverInputPassword = ''
      },
      removeNaverUser (naverUserIndex) {
        this.naverUsers.splice(naverUserIndex, 1)
      },
      saveResult () {
        this.$electron.ipcRenderer.send('download-send-result', this.users)
      }
    },
    watch: {
      proxies: function (proxies) { this.$electron.ipcRenderer.send('save-proxies', proxies) },
      naverUsers: function (naverUsers) { this.$electron.ipcRenderer.send('save-naver-users', naverUsers) }
    },
    data: function () {
      return {
        isActiveProxyModal: false,
        isActiveSettingModal: false,
        isPasswordSecurityMode: true,
        proxyModalInputIp: '',
        proxyModalInputPort: '',
        settingModalNaverInputId: '',
        settingModalNaverInputPassword: '',
        proxies: [],
        users: [],
        naverUsers: [],
        message: ''
      }
    },
    mounted: function () {
      this.$electron.ipcRenderer.on('response-users', (event, users) => {
        this.users = users
      })
      this.$electron.ipcRenderer.on('response-user', (event, user) => {
        this.users.push(user)
      })
      this.$electron.ipcRenderer.on('response-check-proxy', (event, result) => {
        const proxy = this.proxies.filter(proxy => proxy.ip === result.ip && proxy.port === result.port)[0]
        if (proxy) {
          proxy.responseTimeMills = result.responseTimeMills
          proxy.isActive = result.isWorking
        }
      })
      this.$electron.ipcRenderer.on('fail-send-message', (event, error) => {
        alert(error)
      })
      this.$electron.ipcRenderer.on('success-send-message-group', (event, {groups, proxy, message, naverUser}, groupIndex, groupSize) => {
        for (let i = 0; i < groups.length; i++) {
          const localUserIndex = groupIndex * groupSize + i
          this.users[localUserIndex].isSuccess = true
          this.users[localUserIndex].usedProxy = `${proxy.ip}:${proxy.port}`
          this.users[localUserIndex].usedNaverUser = `${naverUser.id}`
        }
      })
      this.$electron.ipcRenderer.on('fail-send-message-group', (event, error, {groups, proxy, message, naverUser}, groupIndex, groupSize) => {
        for (let i = 0; i < groups.length; i++) {
          const localUserIndex = groupIndex * groupSize + i
          this.users[localUserIndex].isSuccess = false
          this.users[localUserIndex].usedProxy = `${proxy.ip}:${proxy.port}`
          this.users[localUserIndex].usedNaverUser = `${naverUser.id}`
        }
      })
      // 저장 되어있는 프록시 리스트를 가져와저장
      this.$electron.ipcRenderer.send('get-saved-proxies')
      this.$electron.ipcRenderer.on('get-saved-proxies', (event, proxies) => { this.proxies = proxies || [] })

      // 저장 되어있는 네이버 계정 리스트를 가져와 저장
      this.$electron.ipcRenderer.send('get-naver-users')
      this.$electron.ipcRenderer.on('get-naver-users', (event, naverUsers) => { this.naverUsers = naverUsers || [] })
    }
  }
</script>

<style scoped>
    .is-green {
        color: green;
    }

    .is-orange {
        color: orange;
    }

    .is-red {
        color: red;
    }

    .is-die {
        color: gray;
    }

    .navbar-burger {
        border: none;
        background: transparent;
    }

    #button-add-naver-user {
        margin-left: 18px;
    }

    .group-user-info {
        margin-top: 3.4rem;
    }

    #title-proxy-list {
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
    }

    .file-proxies .file-cta {
        width: 100%
    }

    .file-proxies .file-label {
        justify-content: center;
    }
</style>
