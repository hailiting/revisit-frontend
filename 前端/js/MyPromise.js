class MyPromise {
  status = "pending";
  result = null;
  resolveStack = [];
  rejectStack = [];
  constructor(exec) {
    this.initBind();
    exec(this.resolve, this.reject);
  }
  initBind() {
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
  }
  resolve(data) {
    if (this.status !== "pending") return;
    this.status = "fulfilled";
    this.result = data;
    while (this.resolveStack.length) {
      this.resolveStack.shift()(this.result);
    }
  }
  reject(err) {
    if (this.status !== "pending") return;
    this.status = "rejected";
    this.result = err;
    while (this.rejectStack.length) {
      this.rejectStack.shift()(this.result);
    }
  }
  then(resolve, reject) {
    resolve = typeof resolve === "function" ? resolve : (res) => res;
    reject = typeof reject === "function" ? reject : (res) => res;
    return new MyPromise((res, rej) => {
      const innerPromise = (cb) => {
        try{
          const v = cb(this.result);
          if (v === innerPromise) {
            throw new Error("then function error");
          }
          if (v instanceof MyPromise) {
            v.then(res, rej);
          } else {
            res(v);
          }
        }catch(e){
          rej(e)
        }
      };
      if (this.status === "fulfilled") {
        innerPromise(resolve);
      } else if (this.status === "rejected") {
        innerPromise(reject);
      } else if (this.status === "pending") {
        this.resolveStack.push(resolve.bind(this));
        this.rejectStack.push(reject.bind(this));
      }
    });
  }
  static all(promises) {
    const result = [];
    let count = 0;
    return new MyPromise((res, rej) => {
      const setResult = (index, data) => {
        result[index] = data;
        count++;
        if (count === promises.length) {
          res(result);
        }
      };
      promises.forEach((promise, index) => {
        promise.then((v) => {
          setResult(index, v);
        });
      });
    });
  }
}

// 1. 基础用法
const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("成功了！")
  }, 1000)
})

p1.then(
  result => console.log("成功：", result),  // 1秒后输出：成功：成功了！
  error => console.log("失败：", error)
)


// 2. 链式调用
const p2 = new MyPromise((resolve, reject) => {
  resolve(1)
})

p2.then(value => {
    console.log(value)  // 输出：1
    return value + 1
  })
  .then(value => {
    console.log(value)  // 输出：2
    return value + 1
  })
  .then(value => {
    console.log(value)  // 输出：3
  })

// 3. Promise.all 示例
const promise1 = new MyPromise(resolve => setTimeout(() => resolve("一"), 1000))
const promise2 = new MyPromise(resolve => setTimeout(() => resolve("二"), 2000))
const promise3 = new MyPromise(resolve => setTimeout(() => resolve("三"), 3000))

MyPromise.all([promise1, promise2, promise3])
  .then(results => {
    console.log(results)  // 3秒后输出：["一", "二", "三"]
  })