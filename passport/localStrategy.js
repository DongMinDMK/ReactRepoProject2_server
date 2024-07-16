const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mysql = require("mysql2/promise");

async function getConnection(){
    const connection = await mysql.createConnection({
        host : 'localhost',
        user : 'root',
        password : 'adminuser',
        database : 'mystargram'
    });
    return connection;
}

module.exports = ()=>{
    passport.use(
        new LocalStrategy(
            {
                usernameField:"email",
                passwordField:"pwd",
            },
            async(email, password, done)=>{
                try{
                    const connection = await getConnection();
                    const sql = "select* from member where email=?";
                    const [rows, fields] = await connection.query(sql, [email]);

                    if(rows.length >= 1){
                        if(password == rows[0].pwd){
                            //정상 로그인
                            done(null, rows[0], null);
                        }else{
                            // 패스워드 틀림
                            done(null, false, {message: "패스워드가 일치하지 않습니다."})
                        }
                    }else{
                        // 아이디 틀림
                        done(null, false, {message: "없는 이메일입니다."})
                    }
                }catch(err){
                    console.error(err);
                    done(err);
                }
            }
        )
    )
}

