<template>
    <div class="container">

        <label class="label is-large">인증 코드를 입력해 주세요</label>

        <div class="field">
            <p class="control">
                <input v-model="passCode" class="input" type="password" placeholder="인증코드">
            </p>
        </div>

        <div class="field">
            <p class="control">
                <button @click="authorize" class="button is-success">
                    인증하기
                </button>
            </p>
        </div>

    </div>
</template>

<script>
  import { db } from '@/firebase'

  export default {
    name: 'auth-page',
    components: {},
    data: function () {
      return {
        passCode: '',
        machineId: ''
      }
    },
    firebase: {
      dbAuthCodes: db.ref('authCodes')
    },
    mounted: function () {
      this.$electron.ipcRenderer.send('request-machine-id')
      this.$electron.ipcRenderer.on('response-machine-id', (event, machineId) => {
        this.machineId = machineId
      })
    },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      goMain () {
        this.$router.replace('main')
      },
      authorize () {
        // 우선 인증 코드는 존재하고 유저의 맥어드레스를 확인해서 48시간 이내에 다른 컴퓨터에서의 접속인지 확인한다.
        const authRef = this.$firebaseRefs.dbAuthCodes.orderByChild('code').equalTo(this.passCode)
        authRef.once('value', snapShot => {
          if (snapShot.val() !== null) {
            // 로그인 기록이 있다면 기기 고유 아이디를 확인하고 같다면 로그인을 시켜주고
            // 다른 고유아이디를 가지고 있다면 48시간이 지난 후에 들어갈 수 있게 해준다
            const authLogKey = Object.keys(snapShot.val())[0]
            const authLog = Object.values(snapShot.val())[0]

            // 인증 코드에 접속 로그가 없다면 기기 아이디를 저장하고 로그인을 시켜준다.
            if (!authLog.machineId) {
              const newAuthLog = {...authLog}
              newAuthLog.loggedInAt = Date.now()
              newAuthLog.machineId = this.machineId
              delete newAuthLog['.key']
              this.$firebaseRefs.dbAuthCodes.child(authLogKey).set(newAuthLog)
              return this.goMain()
            }

            // 머신 아이디가 같음 로그인 가능
            if (authLog.machineId === this.machineId) {
              const newAuthLog = {...authLog}
              newAuthLog.loggedInAt = Date.now()
              delete newAuthLog['.key']
              this.$firebaseRefs.dbAuthCodes.child(authLogKey).set(newAuthLog)
              return this.goMain()
            }

            // 유저의 마지막 로그인 시간과 현재 로그인 시간을 체크하여 48시간이 지났으면 로그인 시켜준다
            const latestLoggedInAt = authLog.loggedInAt
            const currentDate = Date.now()
            const loggedInTimeDiff = currentDate - latestLoggedInAt
            const leftLoggedInMinute = loggedInTimeDiff / 1000 / 60

            // 48시간 이상 지남 새로운 기기 아이디로 로그인 할 수 있음
            if (leftLoggedInMinute >= 48 * 60) {
              const newAuthLog = {...authLog}
              newAuthLog.loggedInAt = Date.now()
              newAuthLog.machineId = this.machineId
              delete newAuthLog['.key']
              this.$firebaseRefs.dbAuthCodes.child(authLogKey).set(newAuthLog)
              return this.goMain()
            }

            // 해당 유저는 이 프로그램을 이용할 수 없음, 기기 아이디가 다른데 48시간이 지나지 않음
            alert('다른 기기에서 로그인 할 수 없습니다')
          } else {
            alert('인증 실패')
          }
        })
      }
    }
  }
</script>

<style scoped>
    .container {
        padding-top: 25%;
        text-align: center;
    }

    .button {
        width: 84%;
    }

    .control {
        text-align: center;
    }

    input.input {
        width: 84%;
    }
</style>
